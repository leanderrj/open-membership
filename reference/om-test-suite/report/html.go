package report

import (
	"fmt"
	"html"
	"io"
	"strings"
)

// WriteHTML renders a Report as a self-contained HTML document. The publisher
// suite writes this to --html-out to give implementers a human-readable view
// of the same data served as JSON. No JS, no external assets.
func (r *Report) WriteHTML(w io.Writer) error {
	var b strings.Builder

	b.WriteString(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>om-test-suite report</title>
<style>
body{font:14px/1.5 -apple-system,sans-serif;margin:2em;max-width:60em;color:#222}
h1,h2,h3{font-weight:600}
table{border-collapse:collapse;width:100%;margin:1em 0}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
.pass{color:#0a7d28}
.fail{color:#b8002e}
.warn{color:#b86500}
.skip{color:#777}
.error{color:#7500b8}
pre{background:#f6f6f6;padding:8px;overflow-x:auto;font-size:12px;white-space:pre-wrap}
.badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;color:#fff}
.badge.pass{background:#0a7d28}
.badge.fail{background:#b8002e}
summary{cursor:pointer}
</style></head><body>`)

	fmt.Fprintf(&b, "<h1>om-test-suite report</h1>")
	fmt.Fprintf(&b, "<p>Suite %s · Spec %s · Subject: %s</p>",
		html.EscapeString(r.SuiteVersion),
		html.EscapeString(r.SpecVersion),
		html.EscapeString(subjectLabel(r.Subject)))

	b.WriteString("<h2>Summary</h2><table><tr><th>Level</th><th>Pass</th><th>Fail</th><th>Warn</th><th>Skip</th><th>Error</th><th>Passed?</th></tr>")
	for _, lvl := range []Level{Level1, Level2, Level5} {
		ls := r.Summary.Levels[lvl]
		badge := "fail"
		if ls.Passed {
			badge = "pass"
		}
		fmt.Fprintf(&b, "<tr><td>Level %d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td>%d</td><td><span class=\"badge %s\">%s</span></td></tr>",
			lvl, ls.Pass, ls.Fail, ls.Warn, ls.Skip, ls.Error, badge, passedLabel(ls.Passed))
	}
	b.WriteString("</table>")

	b.WriteString("<h2>Results</h2>")
	for _, res := range r.Results {
		fmt.Fprintf(&b, "<h3 class=\"%s\">[%s] Level %d · %s · %s</h3>",
			res.Status, strings.ToUpper(string(res.Status)), res.Level,
			html.EscapeString(res.Category), html.EscapeString(res.Name))
		if res.SpecRef != "" {
			fmt.Fprintf(&b, "<p><em>Spec ref:</em> %s</p>", html.EscapeString(res.SpecRef))
		}
		if res.Message != "" {
			fmt.Fprintf(&b, "<p>%s</p>", html.EscapeString(res.Message))
		}
		if res.Artifact != "" {
			fmt.Fprintf(&b, "<details><summary>Artifact</summary><pre>%s</pre></details>",
				html.EscapeString(res.Artifact))
		}
	}

	b.WriteString("</body></html>")

	_, err := io.WriteString(w, b.String())
	return err
}

func subjectLabel(s Subject) string {
	if s.FeedURL != "" {
		return s.FeedURL
	}
	if s.ReaderName != "" {
		return s.ReaderName + " " + s.ReaderVersion
	}
	return s.Kind
}

func passedLabel(p bool) string {
	if p {
		return "PASS"
	}
	return "FAIL"
}
