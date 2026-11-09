require 'rails_helper'

# OneTeam coverage for errors the job retries: they are handled and raised
# again so retry_on can schedule another attempt.
RSpec.describe Captain::Conversation::ResponseBuilderJob do
  it 'handles and re-raises missing attachment files' do
    job = described_class.new
    allow(job).to receive_messages(conversation_pending?: true, newer_customer_message_arrived?: false, handle_error: true)
    allow(job).to receive(:generate_response_with_v2).and_raise(ActiveStorage::FileNotFoundError)

    expect { job.perform(instance_double(Conversation, inbox: nil), instance_double(Captain::Assistant)) }
      .to raise_error(ActiveStorage::FileNotFoundError)
    expect(job).to have_received(:handle_error).with(kind_of(ActiveStorage::FileNotFoundError))
  end
end
