require 'rails_helper'

# OneTeam coverage for the onboarding step that writes the chat widget's
# tagline from the company's brand details. Runs against a fake model.
RSpec.describe Captain::Llm::WidgetTaglineService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) do
    create(:account, name: 'Acme', custom_attributes: {
             brand_info: { title: 'Acme Rockets', description: 'Rockets for all', slogan: 'Up we go', industries: [{ industry: 'Aerospace' }] }
           })
  end

  it 'returns the trimmed tagline, describing the company to the model' do
    model_replies(json_reply(tagline: '  Rockets, answered fast  '))

    expect(described_class.new(account: account).perform[:message]).to eq('Rockets, answered fast')
    expect(model_requests.last['messages'].last['content'])
      .to eq("Company: Acme\nTitle: Acme Rockets\nDescription: Rockets for all\nSlogan: Up we go\nIndustries: Aerospace")
  end

  it 'names only the company when there are no brand details' do
    account.update!(custom_attributes: {})
    model_replies(json_reply(tagline: 'Hi'))

    described_class.new(account: account).perform

    expect(model_requests.last['messages'].last['content']).to eq('Company: Acme')
  end

  it 'returns an empty tagline for an unreadable reply' do
    model_replies(completion({ role: 'assistant', content: '' }, 'stop'))

    expect(described_class.new(account: account).perform[:message]).to eq('')
  end

  it 'passes a model error through' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad' } }.to_json)

    expect(described_class.new(account: account).perform).to include(:error)
  end
end
