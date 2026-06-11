// Supabase Edge Function: meal-ai
// Calls the Claude API server-side so the Anthropic key never reaches the browser.
//
// Deploy:  supabase functions deploy meal-ai
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// JWT verification is on by default for edge functions, so only signed-in
// users can invoke this. RLS protects the data; this protects the AI spend.

import Anthropic from 'npm:@anthropic-ai/sdk'

// claude-3-5-sonnet (from the original spec) is retired; claude-sonnet-4-6 is
// the current Sonnet — best speed/cost balance for a consumer app.
const MODEL = 'claude-sonnet-4-6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MACRO_PROPS = {
  calories: { type: 'integer' },
  protein_g: { type: 'number' },
  carbs_g: { type: 'number' },
  fat_g: { type: 'number' },
} as const

const RECOMMEND_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short meal name' },
          description: {
            type: 'string',
            description: 'Exact composition with portions, e.g. "Grilled chicken breast (150g) + brown rice (3/4 cup) + broccoli (1 cup)"',
          },
          ...MACRO_PROPS,
          reason: { type: 'string', description: 'One sentence: why this fits the user right now' },
        },
        required: ['title', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'reason'],
        additionalProperties: false,
      },
    },
    clarifying_question: {
      type: ['string', 'null'],
      description: 'Only set (with recommendations empty) when context is too vague to recommend anything sensible',
    },
  },
  required: ['recommendations', 'clarifying_question'],
  additionalProperties: false,
} as const

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    meals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          title: { type: 'string' },
          description: { type: 'string', description: 'Recipe with exact portions' },
          ...MACRO_PROPS,
        },
        required: ['meal_type', 'title', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
        additionalProperties: false,
      },
    },
    total_calories: { type: 'integer' },
    notes: { type: 'string', description: 'One short coaching note for the day' },
  },
  required: ['meals', 'total_calories', 'notes'],
  additionalProperties: false,
} as const

const SYSTEM_PROMPT = `You are the meal-decision engine for Meal Minds, a nutrition coaching app.
Your job is pre-decision coaching: tell busy professionals exactly what to eat BEFORE they eat.

Rules:
- Every meal must include exact portions (grams, cups, or units) so it can be logged without measuring guesswork.
- Calorie and macro numbers must be realistic for the stated portions; never invent flattering numbers.
- Respect the user's stated preferences and constraints (diet, dislikes, cooking time, location) strictly.
- Favor high protein when the user's remaining protein budget is large.
- Keep descriptions practical: real restaurant orders or recipes a tired person can make.
- If the request is genuinely too vague to act on (action "recommend" only), return an empty
  recommendations array and one specific clarifying question. Otherwise clarifying_question is null.`

interface ProfileSummary {
  goal: string
  daily_calories: number
  macro_split: string
  preferences: string
}

function recommendPrompt(p: ProfileSummary, context: string, calsLeft: number, proteinLeft: number) {
  return `User profile: goal=${p.goal}, daily target=${p.daily_calories} kcal, macro split=${p.macro_split}, preferences="${p.preferences}".
Remaining today: ${calsLeft} kcal, ~${proteinLeft}g protein.
Situation: ${context}

Recommend exactly 3 meals that fit the remaining budget (each meal should be at most the remaining calories; if remaining is very low, suggest appropriately small meals or snacks).`
}

function planPrompt(p: ProfileSummary, planDate: string, extra: string) {
  return `User profile: goal=${p.goal}, daily target=${p.daily_calories} kcal, macro split=${p.macro_split}, preferences="${p.preferences}".

Build a complete meal plan for ${planDate}: breakfast, lunch, one snack, and dinner.
Total calories must land within 3% of the daily target, with macros close to the split.
${extra ? `Extra instructions from the user: ${extra}` : ''}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, profile } = body as { action: string; profile: ProfileSummary }

    let prompt: string
    let schema: unknown
    if (action === 'recommend') {
      prompt = recommendPrompt(
        profile,
        String(body.context ?? ''),
        Number(body.calories_remaining ?? 0),
        Number(body.protein_remaining_g ?? 0),
      )
      schema = RECOMMEND_SCHEMA
    } else if (action === 'plan_day') {
      prompt = planPrompt(profile, String(body.plan_date ?? 'tomorrow'), String(body.extra_instructions ?? ''))
      schema = PLAN_SCHEMA
    } else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: prompt }],
    })

    if (response.stop_reason === 'refusal') {
      return new Response(JSON.stringify({ error: 'The assistant declined this request.' }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = response.content.find((b) => b.type === 'text')
    if (!text || text.type !== 'text') throw new Error('No text block in model response')

    return new Response(text.text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('meal-ai error:', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
