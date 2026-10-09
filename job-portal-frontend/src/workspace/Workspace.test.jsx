import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../test/test-utils";
import { request } from "./api";
import Profile from "./Profile";
import Feedback from "./Feedback";
import Jobs from "./Jobs";
import { Match } from "./shared";
import { Conversation, ApplicationDetail } from "./Applications";
vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal()),
  request: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
});
it('allows reapplying after withdrawal but blocks duplicate active applications', () => {
  renderWithProviders(<Jobs me={{role: 'ROLE_APPLICANT'}} companies={[]} reload={vi.fn()}
    jobs={[{id: 1, title: 'Java developer', company: 'Demo', status: 'OPEN'}, {id: 2, title: 'React developer', company: 'Demo', status: 'OPEN'}]}
    applications={[{job: {id: 1}, status: 'WITHDRAWN'}, {job: {id: 2}, status: 'APPLIED'}]} />);
  expect(screen.getByRole('button', {name: 'Apply now'})).toBeEnabled();
  expect(screen.getByRole('button', {name: 'Applied ✓'})).toBeDisabled();
});
it('shows saved private notes to the staff feedback view', async () => {
  request.mockResolvedValue([{id: 1, rating: 4, recommendation: 'HOLD', notes: 'Discuss the portfolio', interviewerName: 'Recruiter'}]);
  renderWithProviders(<Feedback application={{id: 7}} />);
  expect(await screen.findByText('Private notes: Discuss the portfolio')).toBeInTheDocument();
});
it('refreshes extraction after CV replacement without losing unsaved profile edits', async () => {
  request.mockImplementation((path, method) => Promise.resolve(method === 'post'
    ? {cvName: 'new.pdf', extractedSkills: 'react', extractionSummary: 'Detected React'}
    : {headline: 'Original', skills: 'Java'}));
  renderWithProviders(<Profile me={{id: 1, name: 'Candidate'}} />);
  fireEvent.change(await screen.findByLabelText('Headline'), {target: {value: 'Unsaved headline'}});
  fireEvent.change(screen.getByLabelText('Upload PDF'), {target: {files: [new File(['%PDF-test'], 'new.pdf', {type: 'application/pdf'})]}});
  expect(await screen.findByText('Detected React')).toBeInTheDocument();
  expect(screen.getByLabelText('Headline')).toHaveValue('Unsaved headline');
  expect(screen.getByLabelText('Skills (comma-separated)')).toHaveValue('Java');
});
it("lets candidates review extracted skills before saving them", async () => {
  request.mockResolvedValue({skills: 'Java', extractedSkills: 'java, react', extractionSummary: 'Detected 2 skills'});
  renderWithProviders(<Profile me={{id: 1, name: 'Candidate', email: 'candidate@test.test'}} />);
  fireEvent.click(await screen.findByRole('button', {name: 'Add detected skills'}));
  expect(screen.getByLabelText('Skills (comma-separated)')).toHaveValue('java, react');
  expect(request).not.toHaveBeenCalledWith('/profile', 'put', expect.anything());
  fireEvent.click(screen.getByRole('button', {name: 'Save profile'}));
  await waitFor(() => expect(request).toHaveBeenCalledWith('/profile', 'put', expect.objectContaining({skills: 'java, react'})));
});
it("saves candidate skills and education to the profile API", async () => {
  request.mockResolvedValue({
    headline: "Graduate",
    skills: "Java",
    education: "Masters",
    projects: "",
    location: "",
    availability: "",
    portfolioUrl: "",
  });
  renderWithProviders(
    <Profile me={{ id: 1, name: "Alex", email: "alex@test.com" }} />,
  );
  const skills = await screen.findByLabelText("Skills (comma-separated)");
  fireEvent.change(skills, { target: { value: "Java, SQL" } });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      "/profile",
      "put",
      expect.objectContaining({ skills: "Java, SQL", education: "Masters" }),
    ),
  );
  expect(await screen.findByRole("status")).toHaveTextContent("Profile saved");
});
it("explains matched and missing skills without inventing a score", async () => {
  request.mockResolvedValue({
    score: null,
    matchedSkills: [],
    missingSkills: [],
    explanation: "No required skills have been listed.",
  });
  renderWithProviders(<Match jobId={5} />);
  expect(
    await screen.findByText("No required skills have been listed."),
  ).toBeInTheDocument();
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.queryByText("0%")).not.toBeInTheDocument();
});
it("sends only the message submitted by the user to the application conversation", async () => {
  request.mockImplementation((path, method) =>
    Promise.resolve(method === "post" ? {} : []),
  );
  renderWithProviders(<Conversation application={{ id: 7 }} me={{ id: 1 }} />);
  await screen.findByText("Start the conversation about this application.");
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "Hello, is Tuesday available?" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith("/applications/7/messages", "post", {
      body: "Hello, is Tuesday available?",
    }),
  );
  expect(screen.getByLabelText("Your message")).toHaveValue("");
});
it("keeps the message draft when the server refuses a send", async () => {
  request.mockImplementation((path, method) =>
    method === "post"
      ? Promise.reject({ response: { data: { message: "Access denied." } } })
      : Promise.resolve([]),
  );
  renderWithProviders(<Conversation application={{ id: 7 }} me={{ id: 1 }} />);
  await screen.findByText("Start the conversation about this application.");
  fireEvent.change(screen.getByLabelText("Your message"), {
    target: { value: "Keep my draft" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Access denied.");
  expect(screen.getByLabelText("Your message")).toHaveValue("Keep my draft");
});
it("preserves unsaved profile changes while uploading a CV", async () => {
  request.mockImplementation((path, method) =>
    Promise.resolve(
      method === "post"
        ? {}
        : {
            headline: "Saved headline",
            skills: "Java",
            cvName: path === "/profile" ? "cv.pdf" : "",
          },
    ),
  );
  renderWithProviders(
    <Profile me={{ id: 1, name: "Alex", email: "alex@test.com" }} />,
  );
  const headline = await screen.findByLabelText("Headline");
  fireEvent.change(headline, { target: { value: "Unsaved new headline" } });
  const file = new File(["%PDF-1.4 test"], "new-cv.pdf", {
    type: "application/pdf",
  });
  fireEvent.change(screen.getByLabelText("Replace PDF"), {
    target: { files: [file] },
  });
  expect(await screen.findByRole("status")).toHaveTextContent("CV uploaded");
  expect(headline).toHaveValue("Unsaved new headline");
});
