import { useEffect, useState } from "react";
import { request, failureMessage, downloadCv } from "./api";
import { Field, Notice } from "./shared";
export default function Profile({ me }) {
  const [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    request("/profile")
      .then(setForm)
      .catch((e) => setError(failureMessage(e)));
  }, []);
  const change = (name, value) => setForm({ ...form, [name]: value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setForm(await request("/profile", "put", form));
      setNotice("Profile saved. Your listed skills now inform job matching.");
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    if (file.size > 5 * 1024 * 1024 || file.type !== "application/pdf") {
      setError("Choose a PDF no larger than 5 MB.");
      return;
    }
    const data = new FormData();
    data.append("file", file);
    setBusy(true);
    try {
      await request("/profile/cv", "post", data);
      const savedProfile = await request("/profile");
      setForm((current) => ({ ...current, cvName: savedProfile.cvName }));
      setNotice(
        "CV uploaded. Recruiters reviewing your applications can download it.",
      );
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="gl-page-heading">
        <span className="gl-eyebrow">Your story, beyond a résumé</span>
        <h1>Make your potential visible.</h1>
        <p>
          Show companies what you know, what you have built, and where you want
          to go.
        </p>
      </header>
      <Notice error={error} notice={notice} />
      {!form ? (
        !error && <p role="status">Loading profile…</p>
      ) : (
        <div className="gl-profile-layout">
          <form className="gl-paper" onSubmit={save}>
            <fieldset disabled={busy}>
              <h2>Your professional profile</h2>
              <Field
                label="Headline"
                name="headline"
                value={form.headline}
                onChange={change}
                maxLength={200}
                placeholder="Computer science graduate · Java & React"
              />
              <Field
                label="Skills (comma-separated)"
                name="skills"
                value={form.skills}
                onChange={change}
                maxLength={2000}
                placeholder="Java, Spring Boot, React, SQL"
              />
              <p className="gl-hint">
                Use specific skills. Matching compares these with the
                requirements listed by each company.
              </p>
              <Field
                textarea
                rows={4}
                label="Education"
                name="education"
                value={form.education}
                onChange={change}
                maxLength={4000}
              />
              <Field
                textarea
                rows={4}
                label="Projects and experience"
                name="projects"
                value={form.projects}
                onChange={change}
                maxLength={4000}
              />
              <div className="gl-form-grid">
                <Field
                  label="Location"
                  name="location"
                  value={form.location}
                  onChange={change}
                  maxLength={200}
                />
                <Field
                  label="Availability"
                  name="availability"
                  value={form.availability}
                  onChange={change}
                  maxLength={200}
                  placeholder="Available from September"
                />
              </div>
              <Field
                label="Portfolio or GitHub URL"
                name="portfolioUrl"
                value={form.portfolioUrl}
                onChange={change}
                type="url"
                maxLength={500}
              />
              <button className="gl-button">
                {busy ? "Saving…" : "Save profile"}
              </button>
            </fieldset>
          </form>
          <aside className="gl-paper gl-cv">
            <span className="gl-monogram">{me.name?.slice(0, 1) || "G"}</span>
            <h2>{me.name}</h2>
            <p>{me.email}</p>
            <hr />
            <h3>Your CV</h3>
            <p>A PDF, up to 5 MB. Visible to companies you apply to.</p>
            {form.cvName && (
              <button
                className="gl-text-button"
                onClick={() =>
                  downloadCv(me.id, form.cvName).catch((e) =>
                    setError(failureMessage(e)),
                  )
                }
              >
                {form.cvName} ↓
              </button>
            )}
            <label className="gl-button secondary">
              {busy ? "Uploading…" : form.cvName ? "Replace PDF" : "Upload PDF"}
              <input
                className="gl-file"
                type="file"
                accept="application/pdf"
                onChange={upload}
                disabled={busy}
              />
            </label>
          </aside>
        </div>
      )}
    </>
  );
}
