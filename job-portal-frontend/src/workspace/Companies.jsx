import { useState } from "react";
import { request, failureMessage } from "./api";
import { Field, Notice, Empty } from "./shared";
export default function Companies({ me, companies, reload }) {
  const [form, setForm] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (name, value) => setForm({ ...form, [name]: value });
  const save = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await request(
        form.id ? `/companies/${form.id}` : "/companies",
        form.id ? "put" : "post",
        form,
      );
      setForm(null);
      setNotice(
        "Company saved. New recruiters can sign in with the account you created.",
      );
      await reload().catch(() =>
        setError(
          "Saved successfully, but the list could not refresh. Use Refresh data to reload it.",
        ),
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
        <span className="gl-eyebrow">Better beginnings, together</span>
        <div className="gl-row">
          <h1>
            {me.role === "ROLE_ADMIN"
              ? "The company community."
              : "Your company."}
          </h1>
          {me.role === "ROLE_ADMIN" && (
            <button
              className="gl-button"
              onClick={() =>
                setForm({
                  name: "",
                  website: "",
                  description: "",
                  recruiterName: "",
                  recruiterEmail: "",
                  password: "",
                })
              }
            >
              + Add company
            </button>
          )}
        </div>
        <p>
          Each company has its own recruiter workspace, opportunities, and
          candidate pipeline.
        </p>
      </header>
      <Notice error={error} notice={notice} />
      {form && (
        <form className="gl-paper" onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="gl-row">
              <h2>{form.id ? "Edit company" : "Create company & recruiter"}</h2>
              <button
                type="button"
                className="gl-text-button"
                onClick={() => setForm(null)}
              >
                Close ×
              </button>
            </div>
            <Field
              label="Company name"
              name="name"
              value={form.name}
              onChange={change}
              required
              maxLength={200}
            />
            <Field
              type="url"
              label="Website"
              name="website"
              value={form.website}
              onChange={change}
              maxLength={500}
            />
            <Field
              textarea
              rows={4}
              label="About the company"
              name="description"
              value={form.description}
              onChange={change}
              maxLength={2000}
            />
            {!form.id && (
              <>
                <h3>Recruiter account</h3>
                <div className="gl-form-grid">
                  <Field
                    label="Recruiter name"
                    name="recruiterName"
                    value={form.recruiterName}
                    onChange={change}
                    required
                    maxLength={200}
                  />
                  <Field
                    label="Recruiter email"
                    name="recruiterEmail"
                    value={form.recruiterEmail}
                    onChange={change}
                    required
                    type="email"
                    maxLength={255}
                  />
                </div>
                <Field
                  label="Initial password"
                  name="password"
                  value={form.password}
                  onChange={change}
                  required
                  type="password"
                  minLength={10}
                  maxLength={72}
                  autoComplete="new-password"
                />
                <p className="gl-hint">
                  Share these credentials with the recruiter through your usual
                  private channel.
                </p>
              </>
            )}
            <button className="gl-button">
              {busy ? "Saving…" : "Save company"}
            </button>
          </fieldset>
        </form>
      )}
      {!companies.length && !form ? (
        <Empty title="Make room for your first company">
          Create a company and its recruiter account to get started.
        </Empty>
      ) : (
        <div className="gl-list">
          {companies.map((c) => (
            <article className="gl-company" key={c.id}>
              <span className="gl-company-mark">
                {c.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <h2>{c.name}</h2>
                <p>{c.description || "No company introduction yet."}</p>
                {/^https?:\/\//i.test(c.website || "") && (
                  <a href={c.website} target="_blank" rel="noreferrer">
                    Company website ↗
                  </a>
                )}
              </div>
              <button
                className="gl-button secondary"
                onClick={() => setForm(c)}
              >
                Edit company
              </button>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
