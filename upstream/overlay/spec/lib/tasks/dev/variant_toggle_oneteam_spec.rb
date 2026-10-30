require 'rails_helper'

# OneTeam coverage for the development-only `chatwoot:dev:toggle_variant` and
# `chatwoot:dev:show_variant` tasks, which switch a local install between
# the Community, Enterprise and Cloud editions.
RSpec.describe 'chatwoot:dev variant tasks' do # rubocop:disable RSpec/DescribeClass
  def config_value(name)
    InstallationConfig.find_by(name: name)&.value
  end

  context 'when running in development' do
    before { allow(Rails.env).to receive(:development?).and_return(true) }

    {
      '1' => %w[Community self-hosted community],
      '2' => %w[Enterprise self-hosted enterprise],
      '3' => %w[Cloud cloud enterprise]
    }.each do |choice, (variant, deployment_env, plan)|
      it "switches to #{variant}" do
        output = run_rake('chatwoot:dev:toggle_variant', input: "#{choice}\n").output

        expect(output).to include("Successfully switched to #{variant} variant!")
        expect(config_value('DEPLOYMENT_ENV')).to eq(deployment_env)
        expect(config_value('INSTALLATION_PRICING_PLAN')).to eq(plan)
        expect(run_rake('chatwoot:dev:show_variant').output).to include("Current Variant: #{variant}")
      end
    end

    it 'can be cancelled' do
      result = run_rake('chatwoot:dev:toggle_variant', input: "0\n")

      expect(result.output).to include('Cancelled. No changes made.')
      expect(result.status).to eq(0)
    end

    it 'rejects other choices' do
      result = run_rake('chatwoot:dev:toggle_variant', input: "7\n")

      expect(result.output).to include('Invalid choice')
      expect(result.status).to eq(1)
    end
  end

  # Pins FINDINGS.md: outside development the guard's `return` inside the
  # task block raises LocalJumpError instead of quietly doing nothing.
  it 'crashes outside development' do
    expect { run_rake('chatwoot:dev:show_variant') }.to raise_error(LocalJumpError)
    expect { run_rake('chatwoot:dev:toggle_variant') }.to raise_error(LocalJumpError)
  end
end
