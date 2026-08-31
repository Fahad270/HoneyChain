import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../api.js";
import { QRCodeSVG } from "qrcode.react";
import "./Verify.css";

function short(h) {
  return h ? h.slice(0, 12) + "…" + h.slice(-6) : "";
}

export default function Verify() {
  const { hash } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const token = search.get("s");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inputHash, setInputHash] = useState(hash || "");
  const [dualPublicKey, setDualPublicKey] = useState(hash || "");
  const [dualPrivateKey, setDualPrivateKey] = useState("");
  const [dualResult, setDualResult] = useState(null);
  const [dualLoading, setDualLoading] = useState(false);

  async function fetchVerify(h, s) {
    setLoading(true);
    setError(null);
    try {
      const qs = s ? `?s=${encodeURIComponent(s)}` : "";
      const res = await api.get(`/ledger/verify/${h}${qs}`);
      setData(res.data.data);
    } catch (e) {
      setError(e?.response?.data?.error || "not found or chain not ready. Check backend is running.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDualVerify(e) {
    e.preventDefault();
    setDualLoading(true);
    setDualResult(null);
    try {
      const res = await api.post("/ledger/verify-dual", {
        publicKey: dualPublicKey.trim(),
        privateKey: dualPrivateKey.trim(),
      });
      setDualResult(res.data.data);
    } catch (e) {
      setDualResult({ ok: false, reason: e?.response?.data?.error || "Verification failed" });
    } finally {
      setDualLoading(false);
    }
  }

  useEffect(() => {
    if (hash) fetchVerify(hash, token);
    else setLoading(false);
  }, [hash, token]);

  const chain = data?.chain || [];
  const block = data?.block || null;
  const jar = data?.jar || null;

  return (
    <div className="page-container verify-page">
      <div className="verify-head">
        <h1>Verify at Khadi Store</h1>
        <p className="dashboard-sub">Scan QR on jar → lands here. Checks if chain is intact, shows who handled it, and freezes after retail.</p>
      </div>

      <div className="card verify-search">
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="field" style={{ flex: 1, minWidth: 260 }}>
            <span>Paste hash from QR</span>
            <input value={inputHash} onChange={(e) => setInputHash(e.target.value)} placeholder="hash …" />
          </label>
          <button
            className="btn btn-primary"
            onClick={() => {
              const h = inputHash.trim();
              if (!h) return;
              const target = token ? `/verify/${h}?s=${encodeURIComponent(token)}` : `/verify/${h}`;
              navigate(target);
              fetchVerify(h, token);
            }}
            disabled={!inputHash.trim()}
          >
            Verify
          </button>
        </div>
        {hash && (
          <div className="verify-meta">
            Viewing <code>{hash}</code> {token && <span>with token <code>{token}</code></span>}
          </div>
        )}
      </div>

      {loading && <div className="card">Checking ledger…</div>}
      {error && <div className="card" style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}>{error}</div>}

      {/* Dual-key verification form */}
      <div className="card dual-verify-card">
        <h3 style={{marginBottom:8}}>🔑 Dual-Key Verification</h3>
        <p className="dashboard-sub" style={{marginBottom:14}}>
          QR on jar = <strong>public key</strong>. Bill code = <strong>private key</strong>. Both required to prove sale authenticity and prevent duplicate QR scams.
        </p>
        <form onSubmit={handleDualVerify} className="dual-form">
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-end"}}>
            <label className="field" style={{flex:1,minWidth:260}}>
              <span>Public key (from QR on jar)</span>
              <input value={dualPublicKey} onChange={(e) => setDualPublicKey(e.target.value)} placeholder="paste hash from QR" required />
            </label>
            <label className="field" style={{minWidth:220}}>
              <span>Private key (from bill)</span>
              <input value={dualPrivateKey} onChange={(e) => setDualPrivateKey(e.target.value)} placeholder="HC-XXXX-XXXX-XXXX-XXXX" required />
            </label>
            <button type="submit" className="btn btn-primary" disabled={dualLoading} style={{height:42}}>
              {dualLoading ? "Verifying…" : "Verify Sale"}
            </button>
          </div>
        </form>

        {dualResult && (
          <div className={`card dual-result ${dualResult.ok ? "ok" : "bad"}`} style={{marginTop:14}}>
            <div className="verify-status-head">
              <span className={`status-pill ${dualResult.ok ? "status-healthy" : "status-critical"}`}>
                {dualResult.ok ? "Authentic" : "Not Authentic"}
              </span>
              {dualResult.duplicate && <span className="status-pill status-critical">⚠️ Duplicate scan</span>}
              {!dualResult.duplicate && dualResult.ok && <span className="status-pill status-healthy">First claim</span>}
            </div>
            <div style={{marginTop:10,fontSize:14,lineHeight:1.6}}>{dualResult.reason}</div>
            {dualResult.verifyCount > 0 && (
              <div style={{marginTop:8,fontSize:12,color:"var(--color-text-muted)"}}>
                Total verifications: {dualResult.verifyCount} |
                First: {dualResult.firstVerifiedAt ? new Date(dualResult.firstVerifiedAt).toLocaleString() : "—"} |
                Last: {dualResult.lastVerifiedAt ? new Date(dualResult.lastVerifiedAt).toLocaleString() : "—"}
              </div>
            )}
            {dualResult.duplicateScans && dualResult.duplicateScans.length > 0 && (
              <div style={{marginTop:8,fontSize:11,color:"var(--color-danger)"}}>
                Previous scans: {dualResult.duplicateScans.length} extra scan(s) detected
              </div>
            )}
          </div>
        )}
      </div>

      {block && (
        <>
          <div className={`card verify-status ${data.valid ? "ok" : "bad"}`}>
            <div className="verify-status-head">
              <span className={`status-pill ${data.valid ? "status-healthy" : "status-critical"}`}>
                {data.valid ? "Chain intact" : "Chain broken"}
              </span>
              {block.is_frozen && <span className="status-pill status-critical">Frozen at retail</span>}
              {!data.tokenValid && <span className="status-pill status-warning">Token mismatch</span>}
              {data.valid && data.tokenValid && block.is_frozen && <span className="status-pill status-healthy">Ready for sale</span>}
              {jar?.duplicateFlag && <span className="status-pill status-critical">⚠️ Duplicate scan detected</span>}
              {!jar?.sold && block.is_frozen === false && <span className="status-pill status-warning">Not sold yet</span>}
            </div>
            {!data.valid && data.reason && <div className="verify-reason">Reason: {data.reason}</div>}
            {!data.tokenValid && <div className="verify-reason">Scan the QR with ?s= token for full verification (one-time token per block).</div>}
            {data.frozenBlock && <div className="verify-reason">Frozen block in ancestry: {short(data.frozenBlock)}</div>}
            {jar?.duplicateFlag && (
              <div className="verify-reason" style={{ color: "var(--color-danger)", fontWeight: 700 }}>
                ⚠️ DUPLICATE QR SCAN: This jar has been verified {jar.verifyCount} times.
                First verified: {jar.firstVerifiedAt ? new Date(jar.firstVerifiedAt).toLocaleString() : "—"}.
                Last verified: {jar.lastVerifiedAt ? new Date(jar.lastVerifiedAt).toLocaleString() : "—"}.
                Possible counterfeit or reused QR label.
              </div>
            )}
          </div>

          <div className="verify-layout">
            <div className="card verify-block">
              <div className="verify-block-head">
                <div className="vb-icon">{block.stage_meta?.icon || "⬡"}</div>
                <div>
                  <div className="vb-stage">{block.stage_meta?.label || block.stage}</div>
                  <div className="vb-step">Step {block.stage_meta?.step} • {block.stage}</div>
                </div>
                <div className="vb-time">{new Date(block.createdAt).toLocaleString()}</div>
              </div>

              <div className="hash-row">
                <span className="hash-label">Hash</span>
                <code className="hash-val">{block.hash}</code>
              </div>
              <div className="hash-row">
                <span className="hash-label">Prev</span>
                <code className="hash-val small">{block.prev_hash || (block.prev_hashes ? block.prev_hashes.join(", ").slice(0, 60) + "…" : "genesis")}</code>
              </div>
              {block.prev_hashes && (
                <div className="pooled-parents">
                  <div className="payload-label">Pooled from {block.prev_hashes.length} farmer blocks</div>
                  <div className="parent-list">
                    {data.pooledParents?.map((p) => (
                      <Link key={p.hash} to={`/verify/${p.hash}`} className="parent-chip">
                        {p.stage} • {short(p.hash)} • {p.data?.hive_id || p.data?.name || "-"}
                      </Link>
                    ))}
                    {data.pooledParents?.length === 0 && block.prev_hashes.map((h) => <code key={h} className="hash-val small">{short(h)}</code>)}
                  </div>
                </div>
              )}

              <div className="block-payload">
                <div className="payload-label">Block data</div>
                <pre className="payload-pre">{JSON.stringify(block.data, null, 2)}</pre>
                {block.beekeeper && (
                  <pre className="payload-pre">beekeeper: {block.beekeeper.name} — {block.beekeeper.village} ({block.beekeeper.phoneNumber || "-"})</pre>
                )}
                {block.collective_name && <pre className="payload-pre">collective: {block.collective_name}</pre>}
                {block.lab && Object.values(block.lab).some(Boolean) && <pre className="payload-pre">lab: {JSON.stringify(block.lab, null, 2)}</pre>}
              </div>

              <div className="verify-qr">
                <div className="qr-box">
                  <QRCodeSVG value={`${window.location.origin}/verify/${block.hash}${block.scan_secret ? `?s=${block.scan_secret}` : token ? `?s=${token}` : ""}`} size={130} />
                </div>
                <div className="qr-caption">Present this QR at next hop to append</div>
              </div>
            </div>

            <div className="card verify-chain">
              <h3>Full chain to this jar</h3>
              <p className="dashboard-sub">From genesis (beekeeper) → pooled collective → processor → lab → frozen retail</p>
              <div className="v-chain">
                {chain.map((c, i) => {
                  if (c.missing) return <div key={c.hash} className="v-item missing">⚠️ Missing {short(c.hash)}</div>;
                  return (
                    <Link key={c.hash} to={`/verify/${c.hash}`} className={`v-item ${c.hash === block.hash ? "active" : ""} ${c.is_frozen ? "frozen" : ""}`}>
                      <div className="v-dot">{c.stage_meta?.icon || i + 1}</div>
                      <div className="v-body">
                        <div className="v-label">{c.stage_meta?.label || c.stage}</div>
                        <div className="v-hash">{short(c.hash)} • {new Date(c.createdAt).toLocaleDateString()}</div>
                      </div>
                      {c.is_frozen && <span className="status-pill status-critical">Frozen</span>}
                    </Link>
                  );
                })}
              </div>
              <div className="verify-actions">
                <Link className="btn btn-outline" to="/ledger">
                  Open full ledger
                </Link>
                <Link className="btn btn-primary" to={`/ledger`}>
                  Go to Khadi Store Ledger
                </Link>
              </div>
            </div>
          </div>
        </>
      )}

      {!block && !loading && !error && (
        <div className="card">
          <h3>How to use at Khadi India</h3>
          <ol className="verify-help">
            <li>Collective scans farmer genesis QR → creates <em>pooled</em> block (many → one)</li>
            <li>Processor scans pooled QR → adds processing block</li>
            <li>Lab scans → adds lab-certified block (CA number)</li>
            <li>Retail scans → adds retail block → chain freezes</li>
            <li>Consumer scans jar QR here — see “Chain intact + Frozen at retail” ✅</li>
          </ol>
        </div>
      )}
    </div>
  );
}
