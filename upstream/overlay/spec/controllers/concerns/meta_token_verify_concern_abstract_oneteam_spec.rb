require 'rails_helper'

# OneTeam coverage for the methods a controller using MetaTokenVerifyConcern
# must override.
RSpec.describe MetaTokenVerifyConcern do
  let(:controller_instance) { Class.new(ApplicationController) { include MetaTokenVerifyConcern }.new }

  it 'asks the controller to supply its app secrets' do
    expect { controller_instance.send(:meta_app_secrets) }.to raise_error(RuntimeError, 'Overwrite this method in your controller')
  end

  it 'asks the controller to check the verify token' do
    expect { controller_instance.send(:valid_token?, 'x') }.to raise_error(RuntimeError, 'Overwrite this method your controller')
  end
end
