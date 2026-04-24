package main

import (
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"os"
	"time"
)

type Report struct {
	HarnessVersion   string      `json:"harness_version"`
	SpecVersion      string      `json:"spec_version"`
	StartedAt        time.Time   `json:"started_at"`
	FinishedAt       time.Time   `json:"finished_at"`
	ReaderA          ReaderInfo  `json:"reader_a"`
	ReaderB          ReaderInfo  `json:"reader_b"`
	Runs             []RunResult `json:"runs"`
	Summary          Summary     `json:"summary"`
}

type ReaderInfo struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Kind    string `json:"kind"`
	Notes   string `json:"notes,omitempty"`
}

type Summary struct {
	Total      int `json:"total"`
	Pass       int `json:"pass"`
	Fail       int `json:"fail"`
	Skipped    int `json:"skipped"`
	EdgeCases  int `json:"edge_cases"`
	CorePass   int `json:"core_pass"`
	CoreTotal  int `json:"core_total"`
}

func summarize(runs []RunResult) Summary {
	s := Summary{Total: len(runs)}
	for _, r := range runs {
		if r.Skipped {
			s.Skipped++
			continue
		}
		if r.Pass {
			s.Pass++
		} else {
			s.Fail++
		}
	}
	return s
}

func writeJSON(rep *Report, w io.Writer) error {
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	return enc.Encode(rep)
}

func writeJSONFile(rep *Report, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return writeJSON(rep, f)
}

var htmlTmpl = template.Must(template.New("report").Funcs(template.FuncMap{
	"badge": func(pass bool) template.HTML {
		if pass {
			return template.HTML(`<span class="pass">PASS</span>`)
		}
		return template.HTML(`<span class="fail">FAIL</span>`)
	},
}).Parse(`<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>OM portability round-trip report</title>
<style>
body { font-family: -apple-system, sans-serif; max-width: 1100px; margin: 2em auto; padding: 0 1em; }
h1 { border-bottom: 2px solid #222; padding-bottom: 0.3em; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #ccc; padding: 0.4em 0.6em; vertical-align: top; text-align: left; }
th { background: #f6f6f6; }
.pass { color: #0a7a0a; font-weight: bold; }
.fail { color: #b00; font-weight: bold; }
.summary { background: #fafafa; padding: 1em; border: 1px solid #ddd; }
details { margin: 0.2em 0; }
code { font-size: 0.85em; }
.edge { background: #fff6e5; }
</style>
</head>
<body>
<h1>OM portability round-trip report</h1>
<div class="summary">
<p><strong>Harness:</strong> {{.HarnessVersion}} &middot; <strong>Spec:</strong> SPEC-PORTABILITY.md {{.SpecVersion}}</p>
<p><strong>Window:</strong> {{.StartedAt.Format "2006-01-02T15:04:05Z07:00"}} &ndash; {{.FinishedAt.Format "2006-01-02T15:04:05Z07:00"}}</p>
<p><strong>Reader A:</strong> {{.ReaderA.Name}} {{.ReaderA.Version}} ({{.ReaderA.Kind}})</p>
<p><strong>Reader B:</strong> {{.ReaderB.Name}} {{.ReaderB.Version}} ({{.ReaderB.Kind}})</p>
<p><strong>Summary:</strong> {{.Summary.Pass}} pass / {{.Summary.Fail}} fail / {{.Summary.Skipped}} skipped of {{.Summary.Total}}</p>
</div>

<table>
<thead><tr><th>ID</th><th>Description</th><th>Envelope</th><th>Direction</th><th>Result</th><th>Duration</th></tr></thead>
<tbody>
{{range .Runs}}
<tr class="{{if not .Pass}}fail{{end}}">
<td><code>{{.ID}}</code></td>
<td>{{.Description}}</td>
<td>{{.Envelope}}</td>
<td>{{.Direction}}</td>
<td>{{badge .Pass}}{{if .Error}} <code>{{.Error}}</code>{{end}}</td>
<td>{{.Duration}}</td>
</tr>
<tr><td colspan="6">
<details><summary>{{len .Checks}} check(s) &middot; spec ref {{.SpecRef}}</summary>
<table>
<thead><tr><th>Check</th><th>Result</th><th>Spec</th><th>Message</th></tr></thead>
<tbody>
{{range .Checks}}
<tr><td><code>{{.Name}}</code></td><td>{{badge .Pass}}</td><td>{{.SpecRef}}</td><td>{{.Message}}</td></tr>
{{end}}
</tbody>
</table>
</details>
</td></tr>
{{end}}
</tbody>
</table>
<p style="color:#666;font-size:0.85em">Report format per <code>reports/README.md</code>. Pass criterion per SPEC-PORTABILITY.md §14.3.</p>
</body>
</html>
`))

func writeHTMLFile(rep *Report, path string) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	return htmlTmpl.Execute(f, rep)
}

func printSummary(rep *Report, w io.Writer) {
	fmt.Fprintf(w, "run total=%d pass=%d fail=%d skipped=%d\n",
		rep.Summary.Total, rep.Summary.Pass, rep.Summary.Fail, rep.Summary.Skipped)
	for _, r := range rep.Runs {
		status := "PASS"
		if !r.Pass {
			status = "FAIL"
		}
		fmt.Fprintf(w, "  [%s] %s  %s\n", status, r.ID, r.Description)
	}
}
