import { useEffect, useState } from "react";
import { request, failureMessage, label } from "./api";
import { Notice } from "./shared";
export default function Analytics() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    request("/analytics")
      .then(setData)
      .catch((e) => setError(failureMessage(e)));
  }, []);
  return (
    <>
      <header className="gl-page-heading">
        <span className="gl-eyebrow">See what is moving</span>
        <h1>Recruitment, in perspective.</h1>
        <p>A live view of your opportunities and application pipeline.</p>
      </header>
      <Notice error={error} />
      {!data && !error ? (
        <p role="status">Loading analytics…</p>
      ) : (
        data && (
          <>
            <div className="gl-metrics">
              {[
                ["Opportunities", data.jobs],
                ["Applications", data.applications],
                ["Scheduled interviews", data.interviews],
                ["Hires", data.hires],
              ].map(([name, value]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="gl-analytics-grid">
              <section className="gl-paper">
                <h2>Where candidates stand</h2>
                <p className="gl-hint">Current application counts by stage</p>
                {Object.entries(data.stages).map(([stage, count]) => (
                  <div className="gl-bar-row" key={stage}>
                    <span>{label(stage)}</span>
                    <div className="gl-bar-track">
                      <div
                        style={{
                          width: `${(count / Math.max(1, data.applications)) * 100}%`,
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))}
              </section>
              <section className="gl-paper">
                <span className="gl-eyebrow">Time to hire</span>
                <strong className="gl-big-number">
                  {data.averageDaysToHire == null
                    ? "—"
                    : Number(data.averageDaysToHire).toFixed(1)}
                </strong>
                <h2>average days</h2>
                <p>
                  {data.averageDaysToHire == null
                    ? "Your first recorded hire will start this measure."
                    : "From application to the recorded hired stage."}
                </p>
              </section>
            </div>
            <section className="gl-paper">
              <h2>Applications by opportunity</h2>
              {data.applicationsByJob.length ? (
                <div className="gl-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Opportunity</th>
                        <th>Applications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.applicationsByJob.map((j) => (
                        <tr key={j.jobId}>
                          <td>{j.title}</td>
                          <td>{j.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No application data yet.</p>
              )}
            </section>
          </>
        )
      )}
    </>
  );
}
