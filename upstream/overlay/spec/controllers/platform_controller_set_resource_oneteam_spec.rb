require 'rails_helper'

RSpec.describe PlatformController do
  it 'requires subclasses to define set_resource' do
    expect { described_class.new.send(:set_resource) }.to raise_error(RuntimeError, 'Overwrite this method your controller')
  end
end
