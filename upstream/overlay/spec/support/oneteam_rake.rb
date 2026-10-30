# Runs a rake task the way an operator would from a terminal: the answers to
# its prompts come from `input`, and what it prints is captured. Tasks that
# stop with `exit` or `abort` return their exit status instead of ending the
# spec run. Pass `tty: true` to see the coloured output a terminal gets.
module OneteamRake
  RakeResult = Struct.new(:output, :status)

  def run_rake(name, *, input: '', tty: false)
    task = Rake::Task[name]
    task.reenable
    status = 0
    original_stdin = $stdin
    $stdin = StringIO.new(input)
    output = capture_rake_output(tty) do
      task.invoke(*)
    rescue SystemExit => e
      status = e.status
    end
    RakeResult.new(output, status)
  ensure
    $stdin = original_stdin
  end

  private

  def capture_rake_output(tty)
    original_stdout = $stdout
    original_stderr = $stderr
    $stdout = StringIO.new
    $stdout.define_singleton_method(:tty?) { true } if tty
    $stderr = $stdout
    yield
    $stdout.string
  ensure
    $stdout = original_stdout
    $stderr = original_stderr
  end
end

RSpec.configure { |config| config.include OneteamRake }
