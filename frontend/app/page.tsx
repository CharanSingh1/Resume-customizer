"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;
const MAX_MB = 5;
const MIN_JD = 100;

type Experience = {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
};

type Result = {
  name: string;
  contact: string;
  summary: string;
  skills: string[];
  highlighted_skills: string[];
  experience: Experience[];
  education: string[];
  other_sections?: { heading: string; items: string[] }[];
  missing_keywords: string[];
  match_score: number;
  changes_summary?: string[];
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(f: File): string | null {
  if (!/\.(pdf|docx)$/i.test(f.name)) {
    return "That file type isn't supported. Upload a PDF or DOCX.";
  }
  if (f.size > MAX_MB * 1024 * 1024) {
    return `That file is over ${MAX_MB} MB. Upload a smaller one.`;
  }
  return null;
}

function resultToText(r: Result) {
  const exp = r.experience
    .map(
      (e) =>
        `${e.title}, ${e.company} (${e.dates})\n${e.bullets
          .map((b) => `- ${b}`)
          .join("\n")}`,
    )
    .join("\n\n");
  const extra = (r.other_sections ?? [])
    .map((s) => `${s.heading}\n${s.items.join("\n")}`)
    .join("\n\n");
  return [
    r.name,
    r.contact,
    `\nSummary\n${r.summary}`,
    `\nSkills\n${r.skills.join(", ")}`,
    `\nExperience\n${exp}`,
    `\nEducation\n${r.education.join("\n")}`,
    extra ? `\n${extra}` : "",
  ].join("\n");
}

function ScoreRing({ value }: { value: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <svg
      className="ring"
      viewBox="0 0 44 44"
      role="img"
      aria-label={`${v}% match`}
    >
      <circle cx="22" cy="22" r={radius} className="ring-track" />
      <circle
        cx="22"
        cy="22"
        r={radius}
        className="ring-fill"
        strokeDasharray={`${(v / 100) * circumference} ${circumference}`}
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26.5" textAnchor="middle" className="ring-text">
        {v}
      </text>
    </svg>
  );
}

function GhostSheet({ loading }: { loading: boolean }) {
  return (
    <div
      className={`paper ${loading ? "pulse" : ""}`}
      role={loading ? "status" : undefined}
      aria-live="polite"
    >
      <p className="ghost-title">
        {loading
          ? "Tailoring your resume…"
          : "Your tailored resume shows up here"}
      </p>
      <p className="ghost-copy">
        {loading
          ? "This usually takes 10 to 20 seconds."
          : "Add a job description and your resume on the left. Your own experience gets reworded and reordered, never invented."}
      </p>
      <div className="bar w55" />
      <div className="bar w30" />
      <div className="gap" />
      <div className="bar w90" />
      <div className="bar w75" />
      <div className="gap" />
      <div className="bar w30" />
      <div className="bar w90" />
      <div className="bar w90" />
      <div className="bar w55" />
    </div>
  );
}

export default function Home() {
  const [jd, setJd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  function onFile(f: File | null | undefined) {
    setError(null);
    if (!f) return;
    const problem = validateFile(f);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setFile(f);
  }

  async function submit() {
    if (jd.trim().length < MIN_JD) {
      return setError(
        `Add the full job description. It needs at least ${MIN_JD} characters.`,
      );
    }
    if (!file) return setError("Upload your resume to continue.");

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("jd", jd);
    form.append("resume", file);

    try {
      const res = await fetch(`${API}/api/customize`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "Something went wrong. Try again.");
      setResult(data as Result);
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Couldn't reach the server. Check your connection and try again."
          : (e as Error).message,
      );
    } finally {
      setLoading(false);
    }
  }

  function downloadText() {
    if (!result) return;
    const blob = new Blob([resultToText(result)], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${result.name.replace(/\s+/g, "_") || "resume"}_tailored.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function copyText() {
    if (!result) return;
    await navigator.clipboard.writeText(resultToText(result));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const matched = new Set(
    (result?.highlighted_skills ?? []).map((s) => s.toLowerCase()),
  );

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="logo" href="#top">
            Tailor
          </a>
          <nav className="topnav" aria-label="Main">
            <a href="#tailor">Tailor my resume</a>
            <a href="#how">How it works</a>
            <a href="https://github.com/CharanSingh1">GitHub</a>
          </nav>
        </div>
      </header>

      <div className="substrip" id="how">
        <ol className="steps">
          <li>
            <span className="step-badge b1">1</span>
            Paste the job description
          </li>
          <li>
            <span className="step-badge b2">2</span>
            Upload your resume
          </li>
          <li>
            <span className="step-badge b3">3</span>
            Copy or download the tailored version
          </li>
        </ol>
      </div>

      <div className="shell" id="top">
        <header className="hero">
          <h1>Make your resume fit the job</h1>
          <p className="lede">
            Paste a job description, upload your resume, and get a version that
            speaks the role&apos;s language. Nothing gets invented. Your own
            experience is reworded and reordered.
          </p>
        </header>

        <main className="workspace" id="tailor">
          <div className="controls">
            <div>
              <label className="field-label" htmlFor="jd">
                Job description
              </label>
              <textarea
                id="jd"
                placeholder="Paste the full job description here"
                value={jd}
                onChange={(e) => setJd(e.target.value)}
              />
              <p className="hint">
                {jd.trim().length} characters, {MIN_JD} minimum
              </p>
            </div>

            <div>
              <span className="field-label">Resume</span>
              <label
                className={`drop ${dragging ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  onFile(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <svg
                  className="drop-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                  <path d="M12 17v-5m0 0-2 2m2-2 2 2" />
                </svg>
                <div className="drop-text">
                  {file ? (
                    <>
                      <p className="drop-title">{file.name}</p>
                      <p className="drop-sub">
                        {formatSize(file.size)}. Select a different file to
                        replace it.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="drop-title">
                        Choose a file or drop it here
                      </p>
                      <p className="drop-sub">PDF or DOCX, up to {MAX_MB} MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={loading}
            >
              {loading ? "Tailoring…" : "Tailor my resume"}
            </button>
          </div>

          <div className="stage">
            {loading || !result ? (
              <GhostSheet loading={loading} />
            ) : (
              <>
                <div className="toolbar">
                  <div className="score">
                    <ScoreRing value={result.match_score} />
                    <div>
                      <p className="label">
                        {Math.round(result.match_score)}% match
                      </p>
                      <p className="sub">Against this job description</p>
                    </div>
                  </div>
                  <div className="actions">
                    <button className="btn btn-quiet" onClick={copyText}>
                      {copied ? "Copied" : "Copy text"}
                    </button>
                    <button className="btn btn-quiet" onClick={downloadText}>
                      Download .txt
                    </button>
                    <button
                      className="btn btn-quiet"
                      onClick={() => window.print()}
                    >
                      Save as PDF
                    </button>
                  </div>
                </div>

                <article className="paper">
                  <h2>{result.name}</h2>
                  <p className="contact">{result.contact}</p>

                  <section>
                    <h3>Summary</h3>
                    <p>{result.summary}</p>
                  </section>

                  <section>
                    <h3>Skills</h3>
                    <ul className="skills">
                      {result.skills.map((s) => (
                        <li
                          key={s}
                          className={
                            matched.has(s.toLowerCase()) ? "match" : ""
                          }
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section>
                    <h3>Experience</h3>
                    {result.experience.map((e, i) => (
                      <div className="job" key={i}>
                        <p className="role">
                          {e.title}, {e.company}
                          <span>{e.dates}</span>
                        </p>
                        <ul className="bullets">
                          {e.bullets.map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </section>

                  {result.education.length > 0 && (
                    <section>
                      <h3>Education</h3>
                      {result.education.map((ed, i) => (
                        <p key={i}>{ed}</p>
                      ))}
                    </section>
                  )}

                  {(result.other_sections ?? []).map((s) => (
                    <section key={s.heading}>
                      <h3>{s.heading}</h3>
                      {s.items.map((item, i) => (
                        <p key={i}>{item}</p>
                      ))}
                    </section>
                  ))}
                </article>

                <aside className="notes">
                  {result.missing_keywords.length > 0 && (
                    <>
                      <h3>Worth adding, if they&apos;re true for you</h3>
                      <p>
                        The job description mentions these, but your resume
                        doesn&apos;t. Highlighted skills in the sheet above
                        already match.
                      </p>
                      <ul className="keywords">
                        {result.missing_keywords.map((k) => (
                          <li key={k}>{k}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {(result.changes_summary ?? []).length > 0 && (
                    <ul className="changes">
                      {result.changes_summary!.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                </aside>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="sitefooter">
        <div className="sitefooter-inner">
          <div className="foot-about">
            <p className="foot-logo">Tailor</p>
            <p>
              A resume customizer built by Charan Singh. It rewords your own
              experience to fit a job, and never makes anything up.
            </p>
          </div>
          <div>
            <p className="foot-title">Explore</p>
            <ul>
              <li>
                <a href="#tailor">Tailor my resume</a>
              </li>
              <li>
                <a href="#how">How it works</a>
              </li>
            </ul>
          </div>
          <div>
            <p className="foot-title">Connect</p>
            <ul>
              <li>
                <a href="https://github.com/CharanSingh1">GitHub</a>
              </li>
              <li>
                <a href="https://linkedin.com/in/charan-singh">LinkedIn</a>
              </li>
              <li>
                <a href="mailto:charan123501@gmail.com">Email</a>
              </li>
            </ul>
          </div>
        </div>
      </footer>

      <div className="subfooter">
        <div className="subfooter-inner">
          <span>&copy; 2026 Your Name</span>
          <span>Your files aren&apos;t stored on the server.</span>
        </div>
      </div>
    </div>
  );
}
