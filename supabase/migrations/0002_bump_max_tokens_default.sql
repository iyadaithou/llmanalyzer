-- Bump existing sessions' max_tokens floor up to the new app default (2048).
--
-- Why: the app default has moved twice — 1024 -> 512 (cost-cutting), then
-- 512 -> 1024 (Gemini was cutting mid-sentence), then 1024 -> 2048 (GPT-5
-- and other reasoning models were burning the whole budget on hidden
-- thinking and emitting no visible answer). Sessions created during those
-- earlier eras are still pinned at 512 or 1024, which silently truncates
-- their responses. This migration raises them all to at least 2048 without
-- touching sessions where the user has explicitly set a *higher* cap.

update public.sessions
set max_tokens = 2048
where max_tokens is null
   or max_tokens < 2048;
