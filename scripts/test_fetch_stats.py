import unittest
from unittest.mock import patch

import fetch_stats


class EventTotalsTest(unittest.TestCase):
    def test_discovery_filter_keeps_period_and_production_filters(self):
        window = {"startAt": 100, "endAt": 200, "hostname": "luns.se", "country": "SE"}
        with patch.object(fetch_stats, "api", return_value=[{"x": "oracle-discovered", "y": 7}]) as api:
            self.assertEqual(fetch_stats.event_total("site", "test", "oracle-discovered", window), 7)
        api.assert_called_once_with(
            "websites/site/metrics", "test", type="event", event="oracle-discovered", **window
        )

    def test_empty_response_means_zero_but_failure_or_invalid_counts_do_not(self):
        with patch.object(fetch_stats, "api", return_value=[]):
            self.assertEqual(fetch_stats.event_total("site", "test", "oracle-discovered", {}), 0)
        for response in ({}, [None], [{"x": "oracle-discovered"}], *[
            [{"x": "oracle-discovered", "y": value}]
            for value in (None, True, -1, 1.5, "invalid")
        ]):
            with self.subTest(response=response), patch.object(fetch_stats, "api", return_value=response):
                self.assertIsNone(fetch_stats.event_total("site", "test", "oracle-discovered", {}))
        with patch.object(fetch_stats, "api", side_effect=fetch_stats.Unavailable("test")):
            self.assertIsNone(fetch_stats.event_total("site", "test", "oracle-discovered", {}))

    def test_build_preserves_verified_zero_and_omits_unavailable_measurement(self):
        def api(path, *args, **kwargs):
            if path.startswith("share/"):
                return {"token": "test", "websiteId": "site"}
            if path.endswith("/stats"):
                return {"visits": 3}
            return []

        for total in (0, 7, None):
            with self.subTest(total=total), patch.object(fetch_stats, "SLUG", "test"), \
                patch.object(fetch_stats, "api", side_effect=api), \
                patch.object(fetch_stats, "event_total", side_effect=[2, total]):
                stats = fetch_stats.build_stats()
                self.assertEqual(stats["searches"], 2)
                self.assertEqual(stats["period"]["days"], 30)
                if total is None:
                    self.assertNotIn("oracleDiscoveries", stats)
                else:
                    self.assertEqual(stats["oracleDiscoveries"], total)


if __name__ == "__main__":
    unittest.main()
