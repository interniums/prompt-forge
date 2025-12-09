'use server'

type EventPayload = Record<string, unknown>

/**
 * Event logging disabled: historically stored analytics in `pf_events`, but this
 * leaked task/prompt contents and created sessions as a side-effect. Keep the
 * signature so callers need no changes, but return null without persisting.
 */
export async function recordEvent(_eventType: string, _payload: EventPayload): Promise<string | null> {
  void _eventType
  void _payload
  return null
}
