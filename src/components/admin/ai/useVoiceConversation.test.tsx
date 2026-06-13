import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVoiceConversation } from "./useVoiceConversation";

// ---- Fake SpeechRecognition that lets the test fire onresult events ----
type ResultLike = ArrayLike<{ transcript: string }> & { isFinal: boolean };

interface FakeRec {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ResultLike> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
}

let currentRec: FakeRec | null = null;

function makeResult(transcript: string, isFinal: boolean): ResultLike {
  const arr: { transcript: string }[] = [{ transcript }];
  // ArrayLike with isFinal flag
  return Object.assign(arr, { isFinal, length: 1 }) as unknown as ResultLike;
}

function fireResult(
  rec: FakeRec,
  resultIndex: number,
  results: ResultLike[],
) {
  const arrLike = Object.assign([...results], { length: results.length });
  rec.onresult?.({ resultIndex, results: arrLike as unknown as ArrayLike<ResultLike> });
}

class FakeSpeechRecognition implements FakeRec {
  continuous = false;
  interimResults = false;
  lang = "en-US";
  onstart: (() => void) | null = null;
  onresult: FakeRec["onresult"] = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error?: string }) => void) | null = null;
  start() {
    currentRec = this;
    queueMicrotask(() => this.onstart?.());
  }
  stop() {
    queueMicrotask(() => this.onend?.());
  }
}

describe("useVoiceConversation — Android Chrome final-result dedupe", () => {
  beforeEach(() => {
    currentRec = null;
    (window as unknown as { webkitSpeechRecognition: typeof FakeSpeechRecognition })
      .webkitSpeechRecognition = FakeSpeechRecognition;
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = undefined;

    // Mock getUserMedia so start() resolves cleanly.
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: () => {} }],
        })),
      },
    });
  });

  it("does not duplicate a final phrase when Chrome re-emits it on later onresult events", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 60_000 }), // long timer so it doesn't auto-fire
    );

    await act(async () => {
      const r = await result.current.start();
      expect(r.ok).toBe(true);
    });

    // Wait until our fake recognizer is wired up
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    // 1) Interim word "creative"
    act(() => fireResult(rec, 0, [makeResult("creative", false)]));
    expect(result.current.liveTranscript).toBe("creative");

    // 2) Same recognizer finalises "creative for this" at index 0
    act(() => fireResult(rec, 0, [makeResult("creative for this", true)]));
    expect(result.current.liveTranscript).toBe("creative for this");

    // 3) Android Chrome bug: redelivers the SAME final result on a later
    //    onresult event (still resultIndex 0). Must NOT be re-appended.
    act(() => fireResult(rec, 0, [makeResult("creative for this", true)]));
    expect(result.current.liveTranscript).toBe("creative for this");

    // 4) Same again — still no duplication.
    act(() => fireResult(rec, 0, [makeResult("creative for this", true)]));
    expect(result.current.liveTranscript).toBe("creative for this");
  });

  it("still appends genuinely new final phrases that follow a redelivered one", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 60_000 }),
    );

    await act(async () => {
      await result.current.start();
    });
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    // First final at index 0
    act(() => fireResult(rec, 0, [makeResult("hello there", true)]));
    expect(result.current.liveTranscript).toBe("hello there");

    // Redelivered (no-op)
    act(() => fireResult(rec, 0, [makeResult("hello there", true)]));
    expect(result.current.liveTranscript).toBe("hello there");

    // Genuinely new final at index 1 must be appended.
    act(() =>
      fireResult(rec, 1, [
        makeResult("hello there", true),
        makeResult("how are you", true),
      ]),
    );
    expect(result.current.liveTranscript).toBe("hello there how are you");
  });

  it("merges incremental final phrases without duplicating overlapping words", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 60_000 }),
    );
    await act(async () => { await result.current.start(); });
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    // Android Chrome pattern: each new final at a new index *contains* the previous one.
    act(() => fireResult(rec, 0, [makeResult("creative", true)]));
    expect(result.current.liveTranscript).toBe("creative");

    act(() => fireResult(rec, 1, [makeResult("creative", true), makeResult("creative for", true)]));
    expect(result.current.liveTranscript).toBe("creative for");

    act(() =>
      fireResult(rec, 2, [
        makeResult("creative", true),
        makeResult("creative for", true),
        makeResult("creative for this", true),
      ]),
    );
    expect(result.current.liveTranscript).toBe("creative for this");
  });

  it("does not duplicate digits when phone-number phrase grows across finals", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 60_000 }),
    );
    await act(async () => { await result.current.start(); });
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    act(() => fireResult(rec, 0, [makeResult("9585", true)]));
    act(() => fireResult(rec, 1, [makeResult("9585", true), makeResult("9585 896", true)]));
    act(() =>
      fireResult(rec, 2, [
        makeResult("9585", true),
        makeResult("9585 896", true),
        makeResult("9585 896 733", true),
      ]),
    );
    expect(result.current.liveTranscript).toBe("9585 896 733");
  });

  it("merges interim echoes so liveTranscript stays clean while speaking", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 60_000 }),
    );
    await act(async () => { await result.current.start(); });
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    act(() => fireResult(rec, 0, [makeResult("create a lead in the name", true)]));
    expect(result.current.liveTranscript).toBe("create a lead in the name");

    // Interim re-echoes the final and adds " of Shruti" — must merge, not duplicate.
    // Real Chrome keeps prior finals in e.results; resultIndex points at the new one.
    act(() =>
      fireResult(rec, 1, [
        makeResult("create a lead in the name", true),
        makeResult("create a lead in the name of Shruti", false),
      ]),
    );
    expect(result.current.liveTranscript).toBe("create a lead in the name of Shruti");
  });

  it("auto-sends the merged transcript without duplicated phrases", async () => {
    const onAutoSend = vi.fn();
    const { result } = renderHook(() =>
      useVoiceConversation({ onAutoSend, silenceMs: 50 }),
    );
    await act(async () => { await result.current.start(); });
    await waitFor(() => expect(currentRec).not.toBeNull());
    const rec = currentRec!;

    act(() => fireResult(rec, 0, [makeResult("create a lead", true)]));
    act(() =>
      fireResult(rec, 1, [
        makeResult("create a lead", true),
        makeResult("create a lead in the name of Shruti", true),
      ]),
    );

    // Wait for the silence timer to fire and call onAutoSend.
    await waitFor(() => expect(onAutoSend).toHaveBeenCalledTimes(1));
    expect(onAutoSend.mock.calls[0][0]).toBe("create a lead in the name of Shruti");
  });
});
