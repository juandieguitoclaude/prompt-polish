import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const busy = atom({ plugin: 'prompt-polish', key: 'busy' } as const, false)

const SYSTEM = `You rewrite a user's rough draft prompt into a clearer, more effective prompt for an AI assistant.
Keep the user's original language and intent. Make the goal explicit, add obviously-missing structure (context, constraints, desired output format), and remove vagueness — without inventing facts the user did not imply or answering the prompt yourself.
Return ONLY the rewritten prompt: no preamble, no quotes, no explanation.`

export const register: Register = on => {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const { Box, Button, Text } = $.ui.resolve(e)

    if (await read($, busy)) {
      return (
        <Box>
          <Text dimColor>✨ Improving your prompt…</Text>
        </Box>
      )
    }

    const improve = async () => {
      const { text } = await $.prompt.read()
      if (!text.trim()) {
        $.ui.toast('Write a draft first, then tap Improve.')
        return
      }

      await update($, busy, () => true)
      try {
        const r = await $.model.complete({
          model: 'sonnet',
          system: SYSTEM,
          prompt: text,
          maxTokens: 2000,
        })
        if (r.isAnswered && r.text.trim()) {
          await $.prompt.fill({ text: r.text.trim(), mode: 'replace' })
        } else {
          $.ui.toast('Could not improve the prompt — try again.')
        }
      } finally {
        await update($, busy, () => false)
      }
    }

    return (
      <Box>
        <Button key="improve" label="✨ Improve prompt" onPress={improve} />
      </Box>
    )
  })
}
