import { useCallback, useEffect, useState } from "react";
import { request, failureMessage, dateLabel, stages, label } from "./api";
import { Match, Notice, Empty, ProfilePreview } from "./shared";
import ApplicationContact from "../components/ApplicationContact";
import InterviewDetails from "../components/InterviewDetails";
import Feedback from "./Feedback";
export function Conversation({ application, me }) {
  const [messages, setMessages] = useState([]),
    [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const load = useCallback(
    () =>
      request(`/applications/${application.id}/messages`)
        .then(setMessages)
        .catch((e) => setError(failureMessage(e)))
        .finally(() => setLoading(false)),
    [application.id],
  );
  useEffect(() => {
    load();
  }, [load]);
  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      await request(`/applications/${application.id}/messages`, "post", {
        body: body.trim(),
      });
      setBody("");
      await load();
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="gl-section">
      <div className="gl-row">
        <h3>Conversation</h3>
        <button className="gl-text-button" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="gl-hint">
        Messages stay inside SkillBridge. Open this conversation to check for
        replies.
      </p>
      <Notice error={error} />
      <div className="gl-messages" aria-live="polite">
        {loading ? (
          <p>Loading messages…</p>
        ) : !messages.length ? (
          <p className="gl-hint">
            Start the conversation about this application.
          </p>
        ) : (
          messages.map((m) => (
            <article
              className={`gl-message ${m.senderId === me.id ? "own" : ""}`}
              key={m.id}
            >
              <div>
                <strong>{m.senderName}</strong>
                <time>{dateLabel(m.createdAt)}</time>
              </div>
              <p>{m.body}</p>
            </article>
          ))
        )}
      </div>
      <form onSubmit={send}>
        <label className="gl-field">
          Your message
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={4000}
            required
          />
        </label>
        <button className="gl-button" disabled={busy || !body.trim()}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </form>
    </section>
  );
}
export function ApplicationDetail({ application, me, onUpdated, onClose }) {
  const staff = me.role !== "ROLE_APPLICANT";
  const [stage, setStage] = useState(application.status),
    [history, setHistory] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setStage(application.status);
    request(`/applications/${application.id}/history`)
      .then(setHistory)
      .catch((e) => setError(failureMessage(e)));
  }, [application.id, application.status]);
  const change = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onUpdated(
        await request(`/applications/${application.id}/stage`, "put", {
          stage,
        }),
      );
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="gl-detail" aria-label="Application details">
      <div className="gl-row">
        <span className="gl-eyebrow">Application #{application.id}</span>
        <button className="gl-text-button" onClick={onClose}>
          Close ×
        </button>
      </div>
      <h2>{staff ? application.user?.name : application.job?.title}</h2>
      <p>
        {staff ? application.job?.title : application.job?.company} ·{" "}
        <span className="gl-tag">{label(application.status)}</span>
      </p>
      <Notice error={error} />
      {staff ? (
        <>
          <form className="gl-stage-form" onSubmit={change}>
            <label className="gl-field">
              Recruitment stage
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="gl-button"
              disabled={busy || stage === application.status}
            >
              Update stage
            </button>
          </form>
          <ProfilePreview userId={application.user.id} />
          <Match jobId={application.job.id} candidateId={application.user.id} />
          <ApplicationContact application={application} onUpdated={onUpdated} />
          <Feedback application={application} />
        </>
      ) : (
        <>
          <InterviewDetails application={application} />
          <Match jobId={application.job.id} />
          {!["WITHDRAWN", "REJECTED", "HIRED"].includes(application.status) && (
            <button
              className="gl-button secondary"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm("Withdraw this application?")) return;
                setBusy(true);
                try {
                  onUpdated(
                    await request(
                      `/applications/${application.id}/stage`,
                      "put",
                      { stage: "WITHDRAWN" },
                    ),
                  );
                } catch (e) {
                  setError(failureMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Withdraw application
            </button>
          )}
        </>
      )}
      <Conversation application={application} me={me} />
      <section className="gl-section">
        <h3>Application timeline</h3>
        {history.length ? (
          <ol className="gl-timeline">
            {history.map((h) => (
              <li key={h.id}>
                <strong>{label(h.stage)}</strong>
                <span>
                  {h.actorName} · {dateLabel(h.createdAt)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="gl-hint">Stage changes will appear here.</p>
        )}
      </section>
    </section>
  );
}
export default function Applications({
  me,
  applications,
  onUpdated,
  messagesOnly = false,
}) {
  const [selected, setSelected] = useState(null),
    [filter, setFilter] = useState(""),
    [dragged, setDragged] = useState(null),
    [dragError, setDragError] = useState("");
  const staff = me.role !== "ROLE_APPLICANT";
  const chosen = applications.find((a) => a.id === selected);
  const shown = applications.filter((a) =>
    `${a.user?.name} ${a.job?.title} ${a.job?.company}`
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const dropApplication = async (stage) => {
    if (!dragged || dragged.status === stage) { setDragged(null); return; }
    const application = applications.find((a) => a.id === dragged.id);
    setDragged(null); setDragError("");
    try { onUpdated(await request(`/applications/${application.id}/stage`, "put", {stage})); }
    catch (error) { setDragError(failureMessage(error)); }
  };
  return (
    <>
      <header className="gl-page-heading">
        <span className="gl-eyebrow">
          {messagesOnly
            ? "Keep the conversation moving"
            : staff
              ? "From first impression to first day"
              : "Every next step, in one place"}
        </span>
        <h1>
          {messagesOnly
            ? "Your conversations."
            : staff
              ? "The talent pipeline."
              : "Your applications."}
        </h1>
        <p>
          {staff
            ? "Review profiles, understand skill matches, and move the right conversations forward."
            : "Follow your progress, prepare for interviews, and speak with your recruiter."}
        </p>
      </header>
      <label className="gl-search">
        Search applications
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Candidate, opportunity or company"
        />
      </label>
      {staff && !messagesOnly && <p className="gl-hint gl-board-hint">Drag a candidate card into another stage to update the pipeline. Use the application detail panel for the accessible stage selector.</p>}
      {dragError && <p className="gl-alert error" role="alert">{dragError}</p>}
      {!applications.length ? (
        <Empty title="No applications yet">
          {staff
            ? "Applications will appear here when candidates apply to your opportunities."
            : "Explore opportunities and send your first application."}
        </Empty>
      ) : (
        <div className={chosen ? "gl-with-detail" : ""}>
          <div>
            {staff && !messagesOnly ? (
              <div className="gl-board">
                {stages.map((s) => (
                  <section className={`gl-column ${dragged ? "drag-target" : ""}`} key={s}
                    onDragOver={(e) => e.preventDefault()} onDrop={() => dropApplication(s)}>
                    <h2>
                      {label(s)}{" "}
                      <span>{shown.filter((a) => a.status === s).length}</span>
                    </h2>
                    {shown
                      .filter((a) => a.status === s)
                      .map((a) => (
                        <button
                          draggable
                          onDragStart={() => setDragged({id: a.id, status: a.status})}
                          onDragEnd={() => setDragged(null)}
                          className={`gl-application ${selected === a.id ? "selected" : ""}`}
                          onClick={() => setSelected(a.id)}
                          key={a.id}
                        >
                          <span className="gl-avatar">
                            {a.user?.name?.slice(0, 1)}
                          </span>
                          <strong>{a.user?.name}</strong>
                          <span>{a.job?.title}</span>
                          <small>
                            {a.interviewAt
                              ? `Interview ${dateLabel(a.interviewAt)}`
                              : `Application #${a.id}`}
                          </small>
                        </button>
                      ))}
                  </section>
                ))}
              </div>
            ) : (
              <div className="gl-list">
                {shown.map((a) => (
                  <button
                    className={`gl-application gl-application-row ${selected === a.id ? "selected" : ""}`}
                    onClick={() => setSelected(a.id)}
                    key={a.id}
                  >
                    <span className="gl-avatar">
                      {(staff ? a.user?.name : a.job?.company)?.slice(0, 1) ||
                        "G"}
                    </span>
                    <span>
                      <strong>{staff ? a.user?.name : a.job?.title}</strong>
                      <span>{staff ? a.job?.title : a.job?.company}</span>
                      {a.interviewAt && (
                        <small>Interview · {dateLabel(a.interviewAt)}</small>
                      )}
                    </span>
                    <span className="gl-tag">{label(a.status)}</span>
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {chosen &&
            (messagesOnly ? (
              <section className="gl-detail">
                <button
                  className="gl-text-button"
                  onClick={() => setSelected(null)}
                >
                  Close ×
                </button>
                <h2>{chosen.job?.title}</h2>
                <Conversation key={chosen.id} application={chosen} me={me} />
              </section>
            ) : (
              <ApplicationDetail
                key={chosen.id}
                application={chosen}
                me={me}
                onUpdated={onUpdated}
                onClose={() => setSelected(null)}
              />
            ))}
        </div>
      )}
    </>
  );
}
