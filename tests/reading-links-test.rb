# Run with: ruby tests/reading-links-test.rb
require "minitest/autorun"
require "yaml"
require "liquid"
require "nokogiri"
require "open3"
require "json"

class ReadingLinksTest < Minitest::Test
  ROOT = File.expand_path("..", __dir__)

  def source(path)
    full_path = File.join(ROOT, path)
    assert File.file?(full_path), "Missing forwarding source: #{path}"
    File.read(full_path)
  end

  def destinations
    YAML.safe_load(source("_data/reading_links.yml"))
  end

  def render(book, links = destinations)
    page_source = source("read/#{book}/index.html")
    page = YAML.safe_load(page_source.split("---", 3).fetch(1))
    layout = source("_layouts/#{page.fetch('layout')}.html")
    html = Liquid::Template.parse(layout, error_mode: :strict).render!(
      { "site" => { "data" => { "reading_links" => links } }, "page" => page },
      strict_variables: true,
      strict_filters: true
    )
    Nokogiri::HTML(html)
  end

  def assert_forwarding(document, expected)
    refresh = document.at_css('meta[http-equiv="refresh"]')
    refute_nil refresh, "JavaScript-disabled readers need a refresh redirect"
    assert_match(/\A0;\s*url=/i, refresh["content"])
    assert_equal expected, refresh["content"].split(/url=/i, 2).last
    anchor = document.at_css("a#reading-link")
    refute_nil anchor, "Readers need an explicit fallback link"
    assert_equal expected, anchor["href"]
    refute_empty anchor.text.strip
    script = document.css("script").map(&:text).join("\n")
    runner = <<~JS
      const vm = require('node:vm');
      const fs = require('node:fs');
      let destination;
      const window = { location: { replace(value) { destination = value; } } };
      const document = { getElementById(id) {
        if (id !== 'reading-link') throw new Error('Missing link: ' + id);
        return { href: process.argv[1] };
      } };
      vm.runInNewContext(fs.readFileSync(0, 'utf8'), { window, document });
      process.stdout.write(JSON.stringify(destination));
    JS
    output, errors, status = Open3.capture3("node", "-e", runner, anchor["href"], stdin_data: script)
    assert status.success?, errors
    assert_equal expected, JSON.parse(output)
  end

  def test_classics_route_opens_its_selected_book
    assert_forwarding(render("classics"), "https://classics.ourstuff.space/")
  end

  def test_feelings_route_opens_its_selected_book
    assert_forwarding(render("feelings"), "https://feelings.ourstuff.space/")
  end

  def test_one_destination_edit_updates_all_forwarding_methods_without_injecting_markup
    links = destinations
    changed_url = 'https://example.com/new-book?edition=2&label=%22reader%22'
    links.fetch("classics")["url"] = changed_url
    links.fetch("classics")["title"] = 'A <reader> & "companion"'
    document = render("classics", links)
    assert_forwarding(document, changed_url)
    assert_equal 'A <reader> & "companion"', document.at_css("h1").text
    assert_empty document.css("reader")
    assert_equal 1, document.css("script").length
  end
end
