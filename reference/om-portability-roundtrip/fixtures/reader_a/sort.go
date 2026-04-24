package reader_a

import (
	"sort"

	"github.com/open-membership-rss/om-portability-roundtrip/shared"
)

func sortMembershipsByProvider(m []shared.Membership) {
	sort.SliceStable(m, func(i, j int) bool { return m[i].Provider < m[j].Provider })
}

func sortBundlesByKey(b []shared.Bundle) {
	sort.SliceStable(b, func(i, j int) bool {
		if b[i].Aggregator != b[j].Aggregator {
			return b[i].Aggregator < b[j].Aggregator
		}
		return b[i].BundleID < b[j].BundleID
	})
}
