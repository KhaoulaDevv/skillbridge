import { useState } from "react";
import axios from "axios";
import { BACKEND_API_URL } from "../config/backend";
import { request, failureMessage, label } from "./api";
import { Field, Notice, Empty, Match } from "./shared";
const blank = {
  title: "",
  description: "",
  companyId: "",
  company: "",
  requiredSkills: "",
  location: "",
  employmentType: "Internship",
  status: "OPEN",
};
export default function Jobs({ me, jobs, companies, applications, reload }) {
  const staff = me.role !== "ROLE_APPLICANT";
  const [form, setForm] = useState(null),
    [selected, setSelected] = useState(null),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const change = (name, value) => setForm({ ...form, [name]: value });
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await request(
        form.id ? `/jobs/${form.id}` : "/jobs",
        form.id ? "put" : "post",
        { ...form, companyId: form.companyId ? Number(form.companyId) : null },
      );
      setForm(null);
      setNotice("Opportunity saved.");
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
  const apply = async (job) => {
    setBusy(true);
    setError("");
    try {
      await axios.post(
        `${BACKEND_API_URL}/api/applications/${job.id}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      await reload().catch(() =>
        setError(
          "Saved successfully, but the list could not refresh. Use Refresh data to reload it.",
        ),
      );
      setNotice(
        `Application submitted for ${job.title}. Follow its progress in Applications.`,
      );
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const shown = jobs.filter((j) =>
    `${j.title} ${j.company} ${j.location} ${j.requiredSkills}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  return (
    <>
      <header className="gl-page-heading">
        <span className="gl-eyebrow">
          {staff
            ? "Build a team with potential"
            : "A good beginning changes everything"}
        </span>
        <div className="gl-row">
          <h1>
            {staff
              ? "Open doors for new talent."
              : "Find your first great move."}
          </h1>
          {staff && (
            <button
              className="gl-button"
              onClick={() => {
                setForm({ ...blank });
                setError("");
              }}
            >
              + Post opportunity
            </button>
          )}
        </div>
        <p>
          {staff
            ? "Create meaningful opportunities. Be clear about the skills that matter."
            : "Internships and graduate roles, with a transparent view of how your skills fit."}
        </p>
      </header>
      <Notice error={error} notice={notice} />
      {form && (
        <form className="gl-paper gl-job-form" onSubmit={save}>
          <fieldset disabled={busy}>
            <div className="gl-row">
              <h2>{form.id ? "Edit opportunity" : "New opportunity"}</h2>
              <button
                type="button"
                className="gl-text-button"
                onClick={() => setForm(null)}
              >
                Close ×
              </button>
            </div>
            <Field
              label="Job title"
              name="title"
              value={form.title}
              onChange={change}
              required
              maxLength={255}
            />
            {me.role === "ROLE_ADMIN" && (
              <>
                <label className="gl-field">
                  Company
                  <select
                    value={form.companyId || ""}
                    onChange={(e) => change("companyId", e.target.value)}
                  >
                    <option value="">Legacy / independent company</option>
                    {companies.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!form.companyId && (
                  <Field
                    label="Company name"
                    name="company"
                    value={form.company}
                    onChange={change}
                    required
                    maxLength={255}
                  />
                )}
              </>
            )}
            <Field
              textarea
              rows={5}
              label="Description"
              name="description"
              value={form.description}
              onChange={change}
              required
              maxLength={10000}
            />
            <Field
              label="Required skills (comma-separated)"
              name="requiredSkills"
              value={form.requiredSkills}
              onChange={change}
              maxLength={2000}
              placeholder="Java, SQL, Spring Boot"
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
                label="Employment type"
                name="employmentType"
                value={form.employmentType}
                onChange={change}
                maxLength={100}
                placeholder="Internship, graduate role…"
              />
            </div>
            {form.id && (
              <label className="gl-field">
                Visibility
                <select
                  value={form.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </label>
            )}
            <button className="gl-button">
              {busy ? "Saving…" : "Save opportunity"}
            </button>
          </fieldset>
        </form>
      )}
      <div className="gl-row gl-results-bar">
        <label className="gl-search">
          Search opportunities
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Role, skill, company or location"
          />
        </label>
        <span>{shown.length} opportunities</span>
      </div>
      {!shown.length ? (
        <Empty title="Your next opportunity is on its way">
          {filter
            ? "Try a different search."
            : staff
              ? "Post an opportunity to start receiving applications."
              : "Check back soon for new roles."}
        </Empty>
      ) : (
        <div className="gl-jobs">
          {shown.map((job) => {
            const applied = applications.some((a) => a.job?.id === job.id && a.status !== 'WITHDRAWN');
            return (
              <article className="gl-job" key={job.id}>
                <div className="gl-row">
                  <span className="gl-company-mark">
                    {job.company?.slice(0, 2).toUpperCase() || "GL"}
                  </span>
                  <span className="gl-tag">
                    {staff
                      ? label(job.status)
                      : job.employmentType || "Opportunity"}
                  </span>
                </div>
                <p className="gl-company-name">{job.company}</p>
                <h2>{job.title}</h2>
                <p className="gl-hint">
                  {[job.location, job.employmentType]
                    .filter(Boolean)
                    .join(" · ") || "Location not specified"}
                </p>
                <p
                  className={
                    selected === job.id
                      ? "gl-description"
                      : "gl-description clipped"
                  }
                >
                  {job.description}
                </p>
                <div className="gl-tags">
                  {job.requiredSkills
                    ?.split(",")
                    .filter((s) => s.trim())
                    .map((s, i) => (
                      <span key={i}>{s.trim()}</span>
                    ))}
                </div>
                {selected === job.id && !staff && <Match jobId={job.id} />}
                <div className="gl-job-actions">
                  <button
                    className="gl-text-button"
                    onClick={() =>
                      setSelected(selected === job.id ? null : job.id)
                    }
                  >
                    {selected === job.id
                      ? "Less detail"
                      : "View details & match"}{" "}
                    ↗
                  </button>
                  {staff ? (
                    <button
                      className="gl-button secondary"
                      onClick={() => {
                        setForm({ ...blank, ...job });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      className="gl-button"
                      disabled={busy || applied}
                      onClick={() => apply(job)}
                    >
                      {applied ? "Applied ✓" : "Apply now"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
