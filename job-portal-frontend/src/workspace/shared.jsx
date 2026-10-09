import { useEffect, useState } from "react";
import { request, failureMessage, downloadCv } from "./api";
export function Notice({ error, notice }) {
  return (
    <>
      {error && (
        <p className="gl-alert error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="gl-alert" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
export function Empty({ title, children }) {
  return (
    <div className="gl-empty">
      <span className="gl-eyebrow">A fresh start</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Field({
  name,
  label,
  value,
  onChange,
  textarea = false,
  ...rest
}) {
  const Element = textarea ? "textarea" : "input";
  return (
    <label className="gl-field">
      {label}
      <Element
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(name, e.target.value)}
        {...rest}
      />
    </label>
  );
}
export function Match({ jobId, candidateId }) {
  const [result, setResult] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setResult(null);
    setError("");
    request(
      `/match/${jobId}${candidateId ? `?candidateId=${candidateId}` : ""}`,
    )
      .then((v) => {
        if (live) setResult(v);
      })
      .catch((e) => {
        if (live) setError(failureMessage(e));
      });
    return () => {
      live = false;
    };
  }, [jobId, candidateId]);
  return (
    <section className="gl-match" aria-label="Skill match">
      <div className="gl-row">
        <h3>Why this match?</h3>
        {result && (
          <strong className="gl-score">
            {result.score == null ? "—" : `${Math.round(result.score)}%`}
          </strong>
        )}
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : !result ? (
        <p role="status">Comparing skills…</p>
      ) : (
        <>
          <p>{result.explanation}</p>
          <div className="gl-tags">
            {result.matchedSkills.map((s) => (
              <span className="matched" key={s}>
                ✓ {s}
              </span>
            ))}
            {result.missingSkills.map((s) => (
              <span className="missing" key={s}>
                Missing: {s}
              </span>
            ))}
          </div>
          <small>
            Based on listed skills only. This supports a conversation; it does
            not make a hiring decision.
          </small>
        </>
      )}
    </section>
  );
}
export function ProfilePreview({ userId }) {
  const [profile, setProfile] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    request(`/profiles/${userId}`)
      .then((p) => {
        if (live) setProfile(p);
      })
      .catch((e) => {
        if (live) setError(failureMessage(e));
      });
    return () => {
      live = false;
    };
  }, [userId]);
  return (
    <section className="gl-section">
      <h3>Candidate profile</h3>
      <Notice error={error} />
      {!profile && !error ? (
        <p>Loading profile…</p>
      ) : (
        profile && (
          <>
            <p className="gl-lead">
              {profile.headline || "No headline added yet"}
            </p>
            {[
              "skills",
              "education",
              "projects",
              "location",
              "availability",
            ].map((key) => (
              <div className="gl-profile-line" key={key}>
                <strong>{key}</strong>
                <p>{profile[key] || "Not added yet"}</p>
              </div>
            ))}
            {profile.portfolioUrl &&
              /^https?:\/\//i.test(profile.portfolioUrl) && (
                <a href={profile.portfolioUrl} target="_blank" rel="noreferrer">
                  Visit portfolio ↗
                </a>
              )}
            {profile.cvName && (
              <>
              {profile.extractedSkills && <div className="gl-profile-line"><strong>CV detected skills</strong><p>{profile.extractedSkills}</p><small>{profile.extractionSummary}</small></div>}
              <button
                className="gl-button secondary"
                onClick={() =>
                  downloadCv(userId, profile.cvName).catch((e) =>
                    setError(failureMessage(e)),
                  )
                }
              >
                Download CV
              </button>
              </>
            )}
          </>
        )
      )}
    </section>
  );
}
