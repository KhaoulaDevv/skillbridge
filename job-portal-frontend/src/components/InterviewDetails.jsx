export const interviewDateLabel = (value) => new Date(value).toLocaleString(undefined, {
    dateStyle: "medium", timeStyle: "short"
});

export default function InterviewDetails({application}) {
    if (!application?.interviewAt) return null;
    const location = application.interviewLocation || "";
    return (
        <section className="border rounded p-3 my-3" aria-label="Interview details">
            <h5>Interview scheduled</h5>
            <p className="mb-1"><time dateTime={application.interviewAt}>{interviewDateLabel(application.interviewAt)}</time>
                {" · "}{application.interviewDurationMinutes} minutes</p>
            <p className="small text-body-secondary">Your time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
            <p className="mb-1" style={{overflowWrap: "anywhere"}}>
                {/^https?:\/\//i.test(location)
                    ? <a href={location} target="_blank" rel="noopener noreferrer">Join interview</a>
                    : location}
            </p>
            {application.interviewNotes && <p className="mb-0" style={{whiteSpace: "pre-wrap", overflowWrap: "anywhere"}}>{application.interviewNotes}</p>}
        </section>
    );
}
