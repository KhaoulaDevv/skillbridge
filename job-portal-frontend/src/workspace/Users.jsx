import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_API_URL } from "../config/backend";
import { failureMessage, label } from "./api";
import { Notice } from "./shared";
export default function Users() {
  const [users, setUsers] = useState([]),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null),
    [loading, setLoading] = useState(true);
  const config = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  };
  useEffect(() => {
    axios
      .get(`${BACKEND_API_URL}/api/users/admin`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => setUsers(r.data))
      .catch((e) => setError(failureMessage(e)))
      .finally(() => setLoading(false));
  }, []);
  const update = async (user) => {
    if (
      user.enabled &&
      !window.confirm(
        `Disable ${user.name}? They will no longer be able to sign in.`,
      )
    )
      return;
    setBusy(user.id);
    setError("");
    try {
      const r = await axios.put(
        `${BACKEND_API_URL}/api/users/admin/applicants/${user.id}/enabled`,
        { enabled: !user.enabled },
        config,
      );
      setUsers((old) => old.map((u) => (u.id === user.id ? r.data : u)));
    } catch (e) {
      setError(failureMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <header className="gl-page-heading">
        <span className="gl-eyebrow">A trusted community</span>
        <h1>People on SkillBridge.</h1>
        <p>
          Manage applicant access. Administrator and recruiter accounts are
          read-only here.
        </p>
      </header>
      <Notice error={error} />
      <label className="gl-search">
        Search people
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Name or email"
        />
      </label>
      {loading ? (
        <p role="status">Loading people…</p>
      ) : (
        <section className="gl-paper gl-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Access</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{label(u.role)}</td>
                    <td>{u.enabled ? "Enabled" : "Disabled"}</td>
                    <td>
                      {u.role === "APPLICANT" ? (
                        <button
                          className="gl-button secondary"
                          disabled={busy === u.id}
                          onClick={() => update(u)}
                        >
                          {busy === u.id
                            ? "Saving…"
                            : u.enabled
                              ? "Disable"
                              : "Enable"}
                        </button>
                      ) : (
                        "Read only"
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
