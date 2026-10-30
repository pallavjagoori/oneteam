require 'rails_helper'

# OneTeam coverage for the PDF FAQ generator's edge cases: removing repeated
# and near-identical questions across page chunks, and a chunk whose model
# reply fails or can't be read (it counts as the end of the content).
RSpec.describe Captain::Llm::PaginatedFaqGeneratorService do
  let(:document) { create(:captain_document) }
  let(:service) { described_class.new(document, pages_per_chunk: 5) }
  let(:client) { instance_double(OpenAI::Client) }

  before do
    allow(Llm::FeatureRouter).to receive(:standard_openai_endpoint?).and_return(false)
    allow(InstallationConfig).to receive(:find_by!).with(name: 'CAPTAIN_OPEN_AI_API_KEY')
                                                   .and_return(instance_double(InstallationConfig, value: 'test-key'))
    allow(OpenAI::Client).to receive(:new).and_return(client)
    allow(document).to receive(:openai_file_id).and_return('file-123')
    allow(Rails.logger).to receive(:error)
  end

  def reply(content)
    { 'choices' => [{ 'message' => { 'content' => content } }] }
  end

  def faqs(*questions, has_content: true)
    reply({ faqs: questions.map { |question| { question: question, answer: 'A' } }, has_content: has_content }.to_json)
  end

  it 'drops repeated and near-identical questions across chunks' do
    allow(client).to receive(:chat).and_return(
      faqs('How do I reset my password?', 'What payment methods do you accept?'),
      faqs(' how do I reset my password? ', 'How do I reset my password today?', 'Can I pay by card?', has_content: false)
    )

    questions = service.generate.pluck('question')

    expect(questions).to eq(['How do I reset my password?', 'What payment methods do you accept?', 'Can I pay by card?'])
  end

  it 'keeps questions that only share a few words' do
    allow(client).to receive(:chat).and_return(faqs('How do I reset my password?', 'How do I export my data?', has_content: false))

    expect(service.generate.size).to eq(2)
  end

  it 'stops at a chunk the model fails on, keeping earlier FAQs' do
    allow(client).to receive(:chat).and_invoke(->(*) { faqs('First?') }, ->(*) { raise OpenAI::Error, 'rate limited' })

    expect(service.generate.pluck('question')).to eq(['First?'])
    expect(Rails.logger).to have_received(:error).with(a_string_including('rate limited'))
  end

  it 'treats an unreadable or empty reply as no more content' do
    allow(client).to receive(:chat).and_return(reply('not json'))

    expect(service.generate).to eq([])
    expect(Rails.logger).to have_received(:error).with(a_string_including('Error parsing chunk response'))

    allow(client).to receive(:chat).and_return(reply(nil))
    expect(described_class.new(document).generate).to eq([])
  end
end
