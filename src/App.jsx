import { useEffect, useRef, useState } from "react"

const WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbwHGk2UE3WVdiz3dgJZ7wtOWTn0VgUBpeZg9OUhJhwD3ANlwm-vX39TDO4zWLw37co9Ew/exec"

const tableColors = [
  "from-rose-400 to-pink-500",
  "from-orange-400 to-amber-500",
  "from-yellow-400 to-orange-500",
  "from-lime-400 to-green-500",
  "from-emerald-400 to-teal-500",
  "from-cyan-400 to-sky-500",
  "from-blue-400 to-indigo-500",
  "from-violet-400 to-purple-500",
  "from-fuchsia-400 to-pink-500",
  "from-red-400 to-orange-500",
  "from-teal-400 to-cyan-500",
]

function getTimestamp() {
  return Date.now()
}

export default function App() {
  const [playerName, setPlayerName] = useState("")
  const [selectedTable, setSelectedTable] = useState(null)
  const [started, setStarted] = useState(false)
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [startTime, setStartTime] = useState(null)
  const [finished, setFinished] = useState(false)
  const [finalTime, setFinalTime] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [nameError, setNameError] = useState("")
  const audioContext = useRef(null)
  const hasPlayerName = playerName.trim().length > 0

  useEffect(() => {
    if (!started || finished || !startTime) return

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [started, finished, startTime])

  function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5)
  }

  function getAudioContext() {
    if (typeof window === "undefined") return null

    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null

    if (!audioContext.current) {
      audioContext.current = new AudioContext()
    }

    const ctx = audioContext.current
    if (ctx.state === "suspended") {
      ctx.resume()
    }

    return ctx
  }

  function playTone(ctx, { type = "sine", frequency, start, duration, volume }) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration)
  }

  function playSound(type) {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    if (type === "correct") {
      playTone(ctx, {
        frequency: 523.25,
        start: now,
        duration: 0.16,
        volume: 0.18,
      })
      playTone(ctx, {
        frequency: 659.25,
        start: now + 0.12,
        duration: 0.18,
        volume: 0.16,
      })
      playTone(ctx, {
        frequency: 783.99,
        start: now + 0.25,
        duration: 0.28,
        volume: 0.15,
      })
      return
    }

    playTone(ctx, {
      type: "triangle",
      frequency: 220,
      start: now,
      duration: 0.16,
      volume: 0.16,
    })
    playTone(ctx, {
      type: "triangle",
      frequency: 164.81,
      start: now + 0.14,
      duration: 0.24,
      volume: 0.14,
    })
  }

  function startGame(table) {
    if (!hasPlayerName) {
      setNameError("กรุณากรอกชื่อก่อนเริ่มเกม")
      return
    }

    setNameError("")
    setPlayerName(playerName.trim())
    setSelectedTable(table)

    const qs = Array.from({ length: 12 }, (_, i) => {
      const correct = table * (i + 1)
      let choices = [correct, correct + 2, correct - 2, correct + 4]

      choices = shuffle(choices)

      return {
        question: `${table} x ${i + 1}`,
        answer: correct,
        choices,
      }
    })

    setQuestions(shuffle(qs))
    setStarted(true)
    setStartTime(getTimestamp())
    setElapsedSeconds(0)
  }

  function resetGame() {
    setStarted(false)
    setSelectedTable(null)
    setQuestions([])
    setCurrentIndex(0)
    setScore(0)
    setWrong(0)
    setStartTime(null)
    setFinished(false)
    setFinalTime(0)
    setElapsedSeconds(0)
    setFeedback(null)
    setNameError("")
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  async function selectAnswer(choice) {
    const current = questions[currentIndex]
    let nextScore = score
    let nextWrong = wrong

    if (choice === current.answer) {
      nextScore++
      setScore(nextScore)
      setFeedback({ icon: "✓", text: "ถูกต้อง!", tone: "text-emerald-600" })
      playSound("correct")
    } else {
      nextWrong++
      setWrong(nextWrong)
      setFeedback({ icon: "×", text: "ลองข้อต่อไป", tone: "text-rose-600" })
      playSound("wrong")
    }

    setTimeout(() => setFeedback(null), 550)

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1)
      return
    }

    const seconds = Math.floor((getTimestamp() - startTime) / 1000)
    const total = seconds + nextWrong * 3

    setFinalTime(total)
    setFinished(true)

    await fetch(WEB_APP_URL, {
      method: "POST",
      body: JSON.stringify({
        name: playerName,
        table: selectedTable,
        correct: nextScore,
        wrong: nextWrong,
        time: seconds,
        finalTime: total,
      }),
    })
  }

  if (!started) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fde047_0,#fb7185_28%,#38bdf8_62%,#f8fafc_100%)] px-4 py-5 sm:px-6">
        <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col justify-center">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-[28px] border-4 border-white/80 bg-white/90 p-5 shadow-2xl sm:p-8">
              <p className="mb-3 inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-bold text-sky-700">
                เกมฝึกสูตรคูณ
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                คิดเร็ว สนุกง่าย สีสันสดใส
              </h1>
              <p className="mt-4 text-lg font-medium leading-8 text-slate-700">
                กรอกชื่อ เลือกแม่สูตรคูณ แล้วเริ่มตอบคำถาม 12 ข้อได้เลย
              </p>

              <label className="mt-6 block text-sm font-bold text-slate-700">
                ชื่อผู้เล่น
              </label>
              <input
                type="text"
                placeholder="กรอกชื่อ"
                className="mt-2 w-full rounded-2xl border-3 border-slate-200 bg-white px-5 py-4 text-xl font-bold text-slate-900 shadow-inner outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  if (e.target.value.trim()) {
                    setNameError("")
                  }
                }}
              />
              {nameError && (
                <p className="mt-3 rounded-2xl bg-rose-100 px-4 py-3 text-base font-bold text-rose-700">
                  {nameError}
                </p>
              )}
            </div>

            <div className="rounded-[28px] border-4 border-white/80 bg-white/90 p-4 shadow-2xl sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-slate-950">
                  เลือกแม่สูตรคูณ
                </h2>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                  แม่ 2-12
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 11 }, (_, i) => i + 2).map(
                  (table, index) => (
                    <button
                      key={table}
                      onClick={() => startGame(table)}
                      className={`min-h-24 rounded-3xl bg-gradient-to-br ${tableColors[index]} p-4 text-left text-white shadow-lg shadow-slate-300/60 transition active:scale-95 sm:hover:-translate-y-1 sm:hover:shadow-xl ${
                        hasPlayerName ? "" : "opacity-80"
                      }`}
                    >
                      <span className="block text-sm font-bold opacity-90">
                        สูตรคูณ
                      </span>
                      <span className="block text-4xl font-black leading-none">
                        {table}
                      </span>
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#22c55e_0%,#38bdf8_45%,#facc15_100%)] px-4 py-6">
        <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center justify-center">
          <div className="w-full rounded-[30px] border-4 border-white bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl font-black text-emerald-600">
              ✓
            </div>
            <h1 className="text-4xl font-black text-slate-950">
              เสร็จแล้ว!
            </h1>
            <p className="mt-2 text-xl font-bold text-slate-600">
              {playerName || "ผู้เล่น"}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-sky-100 p-4">
                <p className="text-sm font-bold text-sky-700">คะแนน</p>
                <p className="text-3xl font-black text-slate-950">
                  {score}/12
                </p>
              </div>
              <div className="rounded-2xl bg-rose-100 p-4">
                <p className="text-sm font-bold text-rose-700">ตอบผิด</p>
                <p className="text-3xl font-black text-slate-950">
                  {wrong} ข้อ
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-amber-100 p-4 text-center">
                <p className="text-sm font-bold text-amber-700">
                  เวลารวมหลังบวกโทษ
                </p>
                <p className="text-4xl font-black text-slate-950">
                  {finalTime} วินาที
                </p>
              </div>
            </div>

            <button
              onClick={resetGame}
              className="mt-6 w-full rounded-2xl bg-slate-950 px-6 py-4 text-xl font-black text-white shadow-lg transition active:scale-95 sm:hover:-translate-y-0.5 sm:hover:bg-slate-800"
            >
              กลับหน้าแรก
            </button>
          </div>
        </section>
      </main>
    )
  }

  const current = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#a7f3d0_0,#38bdf8_34%,#818cf8_68%,#f8fafc_100%)] px-4 py-5 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-lg items-center justify-center">
        <div className="relative w-full rounded-[30px] border-4 border-white bg-white/95 p-4 shadow-2xl sm:p-6">
          {feedback && (
            <div
              className={`absolute -top-8 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border-4 border-white bg-white px-5 py-3 text-2xl font-black shadow-xl ${feedback.tone}`}
            >
              <span>{feedback.icon}</span>
              <span className="text-lg">{feedback.text}</span>
            </div>
          )}

          <div className="mb-5 rounded-3xl bg-slate-950 p-4 text-white">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs font-bold text-sky-200">ข้อ</p>
                <p className="text-xl font-black">
                  {currentIndex + 1}/12
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-200">คะแนน</p>
                <p className="text-xl font-black">{score}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-amber-200">เวลา</p>
                <p className="text-xl font-black">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="rounded-[26px] bg-gradient-to-br from-amber-200 via-orange-100 to-sky-100 px-4 py-8 text-center shadow-inner sm:px-6 sm:py-10">
            <p className="mb-3 text-base font-black text-slate-600">
              แม่ {selectedTable}
            </p>
            <h1 className="text-6xl font-black tracking-normal text-slate-950 sm:text-7xl">
              {current.question}
            </h1>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
            {current.choices.map((choice, index) => (
              <button
                key={choice}
                onClick={() => selectAnswer(choice)}
                className={`min-h-24 rounded-3xl bg-gradient-to-br ${tableColors[index]} p-4 text-4xl font-black text-white shadow-lg shadow-slate-300/70 transition active:scale-95 sm:min-h-28 sm:hover:-translate-y-1 sm:hover:shadow-xl`}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
