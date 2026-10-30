require 'rails_helper'

# OneTeam coverage for the onboarding step that rewrites 1 to 3 crawled web
# pages into one help-center article. It runs against a fake model, so the
# prompt and the structured reply it reads are pinned for the port.
RSpec.describe Captain::Llm::ArticleWriterService do
  include_context 'with a fake OpenAI-compatible model'

  let(:account) { create(:account, locale: 'fr') }
  let(:pages) { [{ url: 'https://a.example', markdown: 'Step one.' }, { url: 'https://b.example', markdown: 'Step two.' }] }

  def write(**)
    described_class.new(account: account, source_pages: pages, **).perform
  end

  # RubyLLM sends the system prompt with the `developer` role.
  def prompt(role)
    model_requests.last['messages'].find { |message| message['role'] == role }['content']
  end

  it 'returns the trimmed title, description and content' do
    model_replies(json_reply(title: ' Billing ', description: ' How to pay ', content: " Pay monthly.\n"))

    expect(write[:message]).to eq(title: 'Billing', description: 'How to pay', content: 'Pay monthly.')
  end

  it 'asks for one article in the account’s language, numbering each source page' do
    model_replies(json_reply(title: 'T', description: 'D', content: 'C'))

    write(hint_title: 'Paying')

    expect(prompt('developer')).to include('Write the title, description, and body in Français (fr).')
    expect(prompt('user')).to eq(<<~TEXT.chomp)
      Suggested title (you may rewrite): Paying

      Source pages (Markdown):

      === Source 1 of 2 (https://a.example) ===
      Step one.

      === Source 2 of 2 (https://b.example) ===
      Step two.
    TEXT
    expect(model_requests.last['response_format']).to include('type' => 'json_schema')
  end

  it 'skips empty pages and shares the length limit between the rest' do
    stub_const("#{described_class}::SOURCE_MAX_LENGTH", 60)
    pages.replace([{ url: 'https://a.example', markdown: 'x' * 100 }, { url: 'https://c.example', markdown: '' }])
    model_replies(json_reply(title: 'T', description: 'D', content: 'C'))

    write

    expect(prompt('user')).to include('=== Source 1 of 1 (https://a.example) ===').and include('[source truncated for length]')
    expect(prompt('user')).not_to include('Suggested title')
  end

  {
    'a locale with no configured name' => %w[xx xx],
    'no locale' => ['', 'English (en)']
  }.each do |case_name, (locale, name)|
    it "names the language for #{case_name}" do
      allow(account).to receive(:locale).and_return(locale)
      model_replies(json_reply(title: 'T', description: 'D', content: 'C'))

      write

      expect(prompt('developer')).to include("body in #{name}.")
    end
  end

  it 'returns an empty article when the model sends nothing usable' do
    model_replies(completion({ role: 'assistant', content: '' }, 'stop'))

    expect(write[:message]).to eq({})
  end

  it 'passes a model error through' do
    stub_request(:post, fake_llm_url).to_return(status: 500, body: { error: { message: 'down' } }.to_json)

    result = write

    expect(result).to include(:error)
    expect(result).not_to include(:usage)
  end
end
