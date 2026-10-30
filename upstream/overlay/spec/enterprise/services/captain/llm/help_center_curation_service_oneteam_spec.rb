require 'rails_helper'

# OneTeam coverage for the onboarding step that picks which pages of a
# company's website become starter help-center articles, grouped into
# categories. Runs against a fake model, so the prompt and the structured
# reply it reads are pinned for the port.
RSpec.describe Captain::Llm::HelpCenterCurationService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) do
    create(:account, name: 'Acme', locale: 'es',
                     custom_attributes: { brand_info: { description: 'Rockets', industries: [{ industry: 'Aerospace' }, 'Retail'] } })
  end
  let(:links) do
    [{ url: 'https://acme.example/help/refunds', title: ' Refunds ', description: ' How refunds work ' },
     { 'url' => 'https://acme.example/brochure.pdf', 'title' => 'Brochure' },
     'https://acme.example/logo.png?v=2']
  end
  let(:service) { described_class.new(account: account, links: links) }

  def prompt(role)
    model_requests.last['messages'].find { |message| message['role'] == role }['content']
  end

  it 'keeps only the categories that the picked articles use' do
    model_replies(json_reply(categories: [{ name: 'Billing', description: 'Money' }, { name: 'Unused', description: 'x' }],
                             articles: [{ title: 'Refunds', category_name: 'Billing', urls: ['https://acme.example/help/refunds'] }]))

    expect(service.perform[:message]).to eq(
      categories: [{ name: 'Billing', description: 'Money' }],
      articles: [{ title: 'Refunds', category_name: 'Billing', urls: ['https://acme.example/help/refunds'] }]
    )
  end

  it 'describes the company and lists the pages, leaving out files and images' do
    model_replies(json_reply(categories: [], articles: []))

    service.perform

    expect(prompt('user')).to eq(<<~TEXT.chomp)
      Company: Acme
      Description: Rockets
      Industries: Aerospace, Retail
      Discovered pages (url — title — description):
      - https://acme.example/help/refunds — Refunds — How refunds work
    TEXT
    expect(prompt('developer')).to include('article titles in Español (es).')
  end

  it 'lists at most 50 pages and leaves out missing brand details' do
    account.update!(custom_attributes: {})
    links.replace((1..60).map { |n| { url: "https://acme.example/help/#{n}" } })
    model_replies(json_reply(categories: [], articles: []))

    service.perform

    expect(prompt('user').lines.count { |line| line.start_with?('- ') }).to eq(50)
    expect(prompt('user')).not_to include('Description:', 'Industries:')
  end

  it 'picks nothing when the model sends nothing usable' do
    model_replies(completion({ role: 'assistant', content: '' }, 'stop'))

    expect(service.perform[:message]).to eq(categories: [], articles: [])
  end

  it 'passes a model error through' do
    stub_request(:post, fake_llm_url).to_return(status: 400, body: { error: { message: 'bad request' } }.to_json)

    expect(service.perform).to include(:error)
  end
end
