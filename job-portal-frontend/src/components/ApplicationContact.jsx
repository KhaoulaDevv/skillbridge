import {useState} from "react";
import axios from "axios";
import {BACKEND_API_URL} from "../config/backend";
import {useSessionTimeout} from "../auth/session";
import InterviewDetails, {interviewDateLabel} from "./InterviewDetails";

const localDateTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function ApplicationContact({application, onUpdated}) {
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [form, setForm] = useState({at: "", duration: 30, location: "", notes: ""});
    const handleSessionTimeout = useSessionTimeout();
    const id = `interview-${application.id}`;
    const active = !["REJECTED", "WITHDRAWN"].includes(application.status);
    const email = application.user?.email;
    const subject = `Your application: ${application.job?.title || "Job opportunity"}`;
    const body = `Hello ${application.user?.name || ""},\n\nRegarding your application for ${application.job?.title || "our position"}.${application.interviewAt
        ? `\n\nInterview: ${interviewDateLabel(application.interviewAt)} (${Intl.DateTimeFormat().resolvedOptions().timeZone})\nDuration: ${application.interviewDurationMinutes} minutes\nLocation: ${application.interviewLocation}\n${application.interviewNotes || ""}` : ""}\n\nBest regards`;
    const beginEditing = () => {
        setForm({at: localDateTime(application.interviewAt), duration: application.interviewDurationMinutes || 30,
            location: application.interviewLocation || "", notes: application.interviewNotes || ""});
        setError(""); setNotice(""); setEditing(true);
    };
    const save = async (event) => {
        event.preventDefault();
        const at = new Date(form.at);
        if (!Number.isFinite(at.getTime()) || at <= new Date()) {
            setError("Choose an interview time in the future."); return;
        }
        if (!form.location.trim()) { setError("Enter a meeting link or address."); return; }
        await update({interviewAt: at.toISOString(), durationMinutes: Number(form.duration),
            location: form.location.trim(), notes: form.notes.trim()});
    };
    const update = async (payload) => {
        if (busy) return;
        setBusy(true); setError(""); setNotice("");
        const config = {headers: {Authorization: `Bearer ${localStorage.getItem("token")}`}};
        try {
            const url = `${BACKEND_API_URL}/api/applications/${application.id}/interview`;
            const response = payload ? await axios.put(url, payload, config) : await axios.delete(url, config);
            onUpdated(response.data);
            setEditing(false);
            setNotice(payload ? "Interview saved. The candidate can view it in their dashboard. Use Email candidate to send a message."
                : "Interview cancelled. It has been removed from the candidate’s dashboard.");
        } catch (failure) {
            if (!handleSessionTimeout(failure)) setError(failure.response?.data?.message || "Could not save the interview. Please try again.");
        } finally { setBusy(false); }
    };
    return (
        <div className="mt-3 border-top pt-3">
            <div className="d-flex flex-wrap gap-2 align-items-center">
                {email && <a className="btn btn-outline-primary btn-sm"
                    href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Email candidate</a>}
                {active && !editing && <button type="button" className="btn btn-outline-secondary btn-sm" onClick={beginEditing} disabled={busy}>
                    {application.interviewAt ? "Reschedule interview" : "Schedule interview"}</button>}
            </div>
            {email && <p className="small mt-2 mb-0" style={{overflowWrap: "anywhere"}}>{email}</p>}
            <InterviewDetails application={application}/>
            {notice && <p role="status" className="small mt-2 text-success">{notice}</p>}
            {error && <p role="alert" className="small mt-2 text-danger">{error}</p>}
            {editing && <form onSubmit={save} className="mt-3" aria-label="Schedule interview">
                <fieldset disabled={busy}>
                    <legend className="h6">Interview for {application.user?.name}</legend>
                    <label className="form-label" htmlFor={`${id}-at`}>Date and time</label>
                    <input id={`${id}-at`} type="datetime-local" className="form-control mb-2" required value={form.at}
                        onChange={e => setForm({...form, at: e.target.value})}/>
                    <p className="small text-body-secondary">Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
                    <label className="form-label" htmlFor={`${id}-duration`}>Duration (minutes)</label>
                    <input id={`${id}-duration`} type="number" min="15" max="480" required className="form-control mb-2" value={form.duration}
                        onChange={e => setForm({...form, duration: e.target.value})}/>
                    <label className="form-label" htmlFor={`${id}-location`}>Meeting link or address</label>
                    <input id={`${id}-location`} maxLength="500" required className="form-control mb-2" value={form.location}
                        onChange={e => setForm({...form, location: e.target.value})}/>
                    <label className="form-label" htmlFor={`${id}-notes`}>Instructions for the candidate</label>
                    <textarea id={`${id}-notes`} maxLength="2000" rows="3" className="form-control mb-3" value={form.notes}
                        onChange={e => setForm({...form, notes: e.target.value})}/>
                    <div className="d-flex flex-wrap gap-2">
                        <button className="btn btn-accent-primary btn-sm" type="submit">{busy ? "Saving…" : "Save interview"}</button>
                        <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setEditing(false)}>Close</button>
                    </div>
                </fieldset>
            </form>}
            {application.interviewAt && !editing && <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy}
                onClick={() => { if (window.confirm("Cancel this interview? It will be removed from the candidate’s dashboard.")) update(null); }}>Cancel interview</button>}
        </div>
    );
}
