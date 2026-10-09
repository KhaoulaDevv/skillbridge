import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearStoredSession, useSessionTimeout } from "../auth/session";
import { request, failureMessage } from "./api";
import { Notice } from "./shared";
import Jobs from "./Jobs";
import Profile from "./Profile";
import Companies from "./Companies";
import Applications from "./Applications";
import Analytics from "./Analytics";
import Users from "./Users";
import "./workspace.css";
export default function Workspace() {
  const [me, setMe] = useState(null),
    [jobs, setJobs] = useState([]),
    [companies, setCompanies] = useState([]),
    [applications, setApplications] = useState([]),
    [page, setPage] = useState("jobs"),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const dispatch = useDispatch(),
    navigate = useNavigate(),
    sessionTimeout = useSessionTimeout();
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        sessionTimeout(error);
        return Promise.reject(error);
      },
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [sessionTimeout]);
  const reload = useCallback(async () => {
    const [j, c, a] = await Promise.all([
      request("/jobs"),
      request("/companies"),
      request("/applications"),
    ]);
    setJobs(j);
    setCompanies(c);
    setApplications(a);
  }, []);
  useEffect(() => {
    let live = true;
    request("/me")
      .then(async (user) => {
        if (!live) return;
        user = {
          ...user,
          role: user.role.startsWith("ROLE_") ? user.role : `ROLE_${user.role}`,
        };
        setMe(user);
        setPage(user.role === "ROLE_APPLICANT" ? "jobs" : "applications");
        await reload();
      })
      .catch((e) => {
        if (!sessionTimeout(e)) setError(failureMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [reload, sessionTimeout]);
  const staff = me?.role !== "ROLE_APPLICANT";
  const nav = staff
    ? [
        ["applications", "Pipeline", "▤"],
        ["jobs", "Opportunities", "↗"],
        ["companies", "Companies", "▦"],
        ["messages", "Messages", "◇"],
        ["analytics", "Analytics", "▥"],
      ]
    : [
        ["jobs", "Explore opportunities", "↗"],
        ["applications", "Applications", "▤"],
        ["profile", "My profile", "○"],
        ["messages", "Messages", "◇"],
      ];
  if (me?.role === "ROLE_ADMIN") nav.push(["users", "People", "○"]);
  const updated = (a) =>
    setApplications((current) =>
      current.map((old) => (old.id === a.id ? a : old)),
    );
  return (
    <div className="gl-app">
      <aside className="gl-sidebar">
        <a
          className="gl-brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage(staff ? "applications" : "jobs");
          }}
        >
          <span className="gl-logo">
            SB
          </span>
          SkillBridge<span className="gl-brand-dot">.</span>
        </a>
        <p className="gl-workspace-label">
          {staff ? "Recruitment workspace" : "Your next chapter"}
        </p>
        <nav aria-label="Workspace">
          {nav.map(([id, name, icon]) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              aria-current={page === id ? "page" : undefined}
              onClick={() => setPage(id)}
            >
              <span aria-hidden="true">{icon}</span>
              {name}
              {id === "applications" && <small>{applications.length}</small>}
            </button>
          ))}
        </nav>
        <div className="gl-sidebar-bottom">
          <p>
            Potential meets
            <br />
            <strong>possibility.</strong>
          </p>
          <div className="gl-account">
            <span className="gl-avatar">{me?.name?.slice(0, 1) || "G"}</span>
            <div>
              <strong>{me?.name || "Your workspace"}</strong>
              <small>
                {staff
                  ? me?.role === "ROLE_ADMIN"
                    ? "Administrator"
                    : "Recruiter"
                  : "Candidate"}
              </small>
            </div>
          </div>
          <button
            className="gl-signout"
            onClick={() => {
              clearStoredSession(dispatch);
              navigate("/");
            }}
          >
            Sign out ↗
          </button>
        </div>
      </aside>
      <main className="gl-main">
        <header className="gl-topbar">
          <span>
            Workspace <span aria-hidden="true">/</span>{" "}
            <strong>{nav.find((n) => n[0] === page)?.[1]}</strong>
          </span>
          <button
            className="gl-text-button"
            disabled={loading}
            onClick={async () => {
              setError("");
              try {
                await reload();
              } catch (e) {
                if (!sessionTimeout(e)) setError(failureMessage(e));
              }
            }}
          >
            Refresh data ↻
          </button>
        </header>
        <div className="gl-content">
          <Notice error={error} />
          {loading ? (
            <div className="gl-empty" role="status">
              <h1>Opening your workspace…</h1>
              <p>Bringing your opportunities and conversations together.</p>
            </div>
          ) : (
            me && (
              <>
                {page === "jobs" && (
                  <Jobs
                    me={me}
                    jobs={jobs}
                    companies={companies}
                    applications={applications}
                    reload={reload}
                  />
                )}{" "}
                {page === "profile" && <Profile me={me} />}{" "}
                {page === "companies" && (
                  <Companies me={me} companies={companies} reload={reload} />
                )}{" "}
                {["applications", "messages"].includes(page) && (
                  <Applications
                    key={page}
                    me={me}
                    applications={applications}
                    onUpdated={updated}
                    messagesOnly={page === "messages"}
                  />
                )}{" "}
                {page === "analytics" && <Analytics />}
                {page === "users" && me.role === "ROLE_ADMIN" && <Users />}
              </>
            )
          )}
        </div>
        <footer className="gl-footer">
          SkillBridge · A place for meaningful beginnings.
        </footer>
      </main>
    </div>
  );
}
