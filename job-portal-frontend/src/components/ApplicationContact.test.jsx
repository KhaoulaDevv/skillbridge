import {fireEvent, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import {renderWithProviders} from '../test/test-utils';
import ApplicationContact from './ApplicationContact';
import InterviewDetails from './InterviewDetails';

vi.mock('axios');
const application = {id: 10, status: 'ACCEPTED', user: {name: 'Candidate', email: 'candidate@example.com'}, job: {title: 'Java & React Developer'}};

beforeEach(() => { vi.resetAllMocks(); localStorage.setItem('token', 'test-token'); });

it('opens an encoded email draft and saves the entered local time as an instant', async () => {
    const onUpdated = vi.fn();
    axios.put.mockResolvedValue({data: {...application, interviewAt: '2035-06-12T12:00:00Z'}});
    renderWithProviders(<ApplicationContact application={application} onUpdated={onUpdated}/>);
    expect(screen.getByRole('link', {name: 'Email candidate'}).getAttribute('href')).toContain('subject=Your%20application%3A%20Java%20%26%20React%20Developer');
    await userEvent.click(screen.getByRole('button', {name: 'Schedule interview'}));
    fireEvent.change(screen.getByLabelText('Date and time'), {target: {value: '2035-06-12T14:00'}});
    fireEvent.change(screen.getByLabelText('Meeting link or address'), {target: {value: 'Office 2'}});
    await userEvent.click(screen.getByRole('button', {name: 'Save interview'}));
    await waitFor(() => expect(onUpdated).toHaveBeenCalled());
    expect(axios.put).toHaveBeenCalledWith(expect.stringContaining('/10/interview'), expect.objectContaining({
        interviewAt: new Date('2035-06-12T14:00').toISOString(), durationMinutes: 30, location: 'Office 2'
    }), expect.objectContaining({headers: {Authorization: 'Bearer test-token'}}));
    expect(screen.getByRole('status')).toHaveTextContent('Interview saved');
});

it('keeps the form and displays a server error if saving fails', async () => {
    axios.put.mockRejectedValue({response: {status: 409, data: {message: 'Application was withdrawn.'}}});
    renderWithProviders(<ApplicationContact application={application} onUpdated={vi.fn()}/>);
    await userEvent.click(screen.getByRole('button', {name: 'Schedule interview'}));
    fireEvent.change(screen.getByLabelText('Date and time'), {target: {value: '2035-06-12T14:00'}});
    fireEvent.change(screen.getByLabelText('Meeting link or address'), {target: {value: 'Office 2'}});
    await userEvent.click(screen.getByRole('button', {name: 'Save interview'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Application was withdrawn.');
    expect(screen.getByLabelText('Meeting link or address')).toHaveValue('Office 2');
});

it('does not turn a dangerous location into a link', () => {
    renderWithProviders(<InterviewDetails application={{...application, interviewAt: '2035-06-12T12:00:00Z', interviewDurationMinutes: 30, interviewLocation: 'javascript:alert(1)'}}/>);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
});

it('requires confirmation before cancelling an interview', async () => {
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal('confirm', confirm);
    const onUpdated = vi.fn();
    axios.delete.mockResolvedValue({data: application});
    renderWithProviders(<ApplicationContact application={{...application, interviewAt: '2035-06-12T12:00:00Z'}} onUpdated={onUpdated}/>);
    await userEvent.click(screen.getByRole('button', {name: 'Cancel interview'}));
    expect(axios.delete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole('button', {name: 'Cancel interview'}));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(application));
    vi.unstubAllGlobals();
});
