# Chatwoot's specs always load the enterprise folder, so when an enterprise
# module (prepend_mod_with) replaces a method outright, the community
# edition's version of that method never runs. OneTeam ports both editions,
# so this helper builds a subclass that puts the community versions back.
module OneteamCommunityEdition
  # A subclass of klass whose listed methods are klass's own definitions,
  # skipping the enterprise modules prepended to it.
  def community_edition_of(klass, *method_names)
    Class.new(klass) do
      method_names.each do |name|
        method = klass.instance_method(name)
        method = method.super_method until method.owner == klass
        define_method(name, method)
      end
    end
  end
end

RSpec.configure do |config|
  config.include OneteamCommunityEdition
end
