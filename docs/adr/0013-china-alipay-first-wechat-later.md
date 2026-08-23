# China Station: Alipay first, WeChat Pay later

China Station takes Alipay in the first version. WeChat Pay is real demand and a later plug-in, not day-one. An Independent Station is a website, so WeChat Pay splits into scan-on-desktop, mobile browser, and in-WeChat page—each with its own credentials, domain filing, and debug path. Alipay page pay already has a working sandbox. First WeChat slice, when we do it, is desktop scan (Native).

**Status:** accepted

**Considered Options:** Alipay and WeChat together in v1; Alipay only with no socket; Alipay first, WeChat socket later

**Consequences:** Portal payment settings show Alipay as live and WeChat as a greyed “coming later” slot. Do not prototype three WeChat checkouts in `chanpin/` v1. Keep the adapter seam so WeChat can plug in without rewriting checkout.
