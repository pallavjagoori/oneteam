require 'rails_helper'

# OneTeam coverage: a stored multimodal message (text and image parts) is
# split back into its text and image URLs before it is sent to the model.
RSpec.describe Captain::OpenAiMessageBuilderService do
  it 'joins the text parts and lists the image URLs' do
    content = [{ type: 'text', text: 'What is' }, { type: 'image_url', image_url: { url: 'https://img.example/1.png' } },
               { type: 'text', text: 'this?' }, { type: 'image_url', image_url: {} }]

    expect(described_class.extract_text_and_attachments(content)).to eq(['What is this?', ['https://img.example/1.png']])
  end

  it 'has no text for an image-only message, and passes plain text through' do
    expect(described_class.extract_text_and_attachments([{ type: 'image_url', image_url: { url: 'u' } }])).to eq([nil, ['u']])
    expect(described_class.extract_text_and_attachments('Hi')).to eq(['Hi', []])
  end
end
