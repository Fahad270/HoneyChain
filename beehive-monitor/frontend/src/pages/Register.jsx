import { useState } from "react";
import api from "../api.js";
import "./Register.css";

const CATEGORIES = ["Individual Beekeeper", "Firm", "Society", "Company"];

const SIDE_SECTIONS = [
  { key: "basic", label: "Basic", enabled: true },
  { key: "training", label: "Training", enabled: false },
  { key: "landholding", label: "Landholding", enabled: false },
  { key: "migration", label: "Migration", enabled: false },
  { key: "honey", label: "Honey Supply", enabled: false },
  { key: "achievements", label: "Last Year Achievements", enabled: false },
  { key: "disease", label: "Disease and Pest Management", enabled: false },
  { key: "documents", label: "Documents Upload", enabled: false },
  { key: "payment", label: "Payment", enabled: false },
];

const emptyForm = {
  aadhaarNo: "",
  name: "",
  dateOfBirth: "",
  gender: "",
  pinCode: "",
  state: "",
  district: "",
  postalAddress: "",
  phoneNumber: "",
  email: "",
  fatherOrHusbandName: "",
  caste: "",
  noOfBeeColonies: "",
  planToIncreaseColonies: "",
  memberOfFpoCooperativeShg: "",
  educationalQualification: "",
  experienceInBeekeepingYears: "",
  businessState: "",
  businessDistrict: "",
  businessAddress: "",
  nomineeName: "",
  nomineeDob: "",
};

export default function Register() {
  const [category, setCategory] = useState(0);
  const [activeSection, setActiveSection] = useState("basic");
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(null); // null | "saving" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      await api.post("/beekeepers/register", {
        ...form,
        category: CATEGORIES[category].toLowerCase().includes("individual")
          ? "individual"
          : CATEGORIES[category].toLowerCase(),
      });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err?.response?.data?.error || "Something went wrong. Check the backend is running.");
    }
  }

  return (
    <div className="register-page">
      <div className="register-banner">
        <div className="register-banner-inner">
          <div className="register-banner-tag">National Bee Board · NBHM</div>
          <h1>Beekeeper Registration</h1>
        </div>
      </div>

      <div className="page-container register-container">
        <div className="category-tabs">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              className={"category-tab" + (i === category ? " active" : "")}
              onClick={() => setCategory(i)}
            >
              {i === category && <span className="tick">✓</span>}
              {cat}
            </button>
          ))}
        </div>

        <div className="register-layout">
          <aside className="register-sidebar">
            {SIDE_SECTIONS.map((s) => (
              <button
                key={s.key}
                disabled={!s.enabled}
                className={
                  "sidebar-item" +
                  (activeSection === s.key ? " active" : "") +
                  (!s.enabled ? " disabled" : "")
                }
                onClick={() => s.enabled && setActiveSection(s.key)}
              >
                {s.label}
                {!s.enabled && <span className="soon-tag">Soon</span>}
              </button>
            ))}
          </aside>

          <form className="register-form card" onSubmit={handleSubmit}>
            <div className="form-header">
              <label className="field">
                <span>Aadhaar No</span>
                <input
                  value={form.aadhaarNo}
                  onChange={(e) => update("aadhaarNo", e.target.value)}
                  placeholder="XXXX XXXX XXXX"
                  required
                />
              </label>
              <button type="button" className="btn btn-outline">
                Get Aadhaar Info
              </button>
            </div>

            <div className="section-banner">
              Aadhaar Details <span>(Change not allowed here — update Aadhaar for changes)</span>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </label>
              <label className="field">
                <span>Date of Birth</span>
                <input type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
              </label>
              <label className="field">
                <span>Gender</span>
                <select value={form.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="">-- Gender --</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="field">
                <span>PIN Code</span>
                <input value={form.pinCode} onChange={(e) => update("pinCode", e.target.value)} />
              </label>
              <label className="field">
                <span>State</span>
                <select value={form.state} onChange={(e) => update("state", e.target.value)}>
                  <option value="">-- Select State --</option>
                  <option value="maharashtra">Maharashtra</option>
                  <option value="karnataka">Karnataka</option>
                  <option value="gujarat">Gujarat</option>
                  <option value="uttar pradesh">Uttar Pradesh</option>
                </select>
              </label>
              <label className="field">
                <span>District</span>
                <input value={form.district} onChange={(e) => update("district", e.target.value)} />
              </label>
              <label className="field">
                <span>Postal Address</span>
                <input value={form.postalAddress} onChange={(e) => update("postalAddress", e.target.value)} />
              </label>
              <label className="field">
                <span>Phone Number (as on Aadhaar)</span>
                <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value)} required />
              </label>
              <label className="field">
                <span>Email ID</span>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Father / Husband Name</span>
                <input value={form.fatherOrHusbandName} onChange={(e) => update("fatherOrHusbandName", e.target.value)} />
              </label>
              <label className="field">
                <span>Caste</span>
                <input value={form.caste} onChange={(e) => update("caste", e.target.value)} />
              </label>
              <label className="field">
                <span>No. of Bee Colonies</span>
                <input type="number" min="0" value={form.noOfBeeColonies} onChange={(e) => update("noOfBeeColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Plan to Increase Colonies</span>
                <input value={form.planToIncreaseColonies} onChange={(e) => update("planToIncreaseColonies", e.target.value)} />
              </label>
              <label className="field">
                <span>Member of FPO / Cooperative / SHG?</span>
                <select
                  value={form.memberOfFpoCooperativeShg}
                  onChange={(e) => update("memberOfFpoCooperativeShg", e.target.value)}
                >
                  <option value="">-- Select --</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="field">
                <span>Educational Qualification</span>
                <input value={form.educationalQualification} onChange={(e) => update("educationalQualification", e.target.value)} />
              </label>
              <label className="field">
                <span>Experience in Beekeeping (years)</span>
                <input
                  type="number"
                  min="0"
                  value={form.experienceInBeekeepingYears}
                  onChange={(e) => update("experienceInBeekeepingYears", e.target.value)}
                />
              </label>
            </div>

            <div className="section-banner">Business Activity Address</div>
            <div className="form-grid">
              <label className="field">
                <span>State</span>
                <input value={form.businessState} onChange={(e) => update("businessState", e.target.value)} />
              </label>
              <label className="field">
                <span>District</span>
                <input value={form.businessDistrict} onChange={(e) => update("businessDistrict", e.target.value)} />
              </label>
              <label className="field field-wide">
                <span>Address</span>
                <textarea rows="2" value={form.businessAddress} onChange={(e) => update("businessAddress", e.target.value)} />
              </label>
            </div>

            <div className="section-banner">Nominee Details</div>
            <div className="form-grid">
              <label className="field">
                <span>Nominee Name</span>
                <input value={form.nomineeName} onChange={(e) => update("nomineeName", e.target.value)} />
              </label>
              <label className="field">
                <span>Nominee DOB</span>
                <input type="date" value={form.nomineeDob} onChange={(e) => update("nomineeDob", e.target.value)} />
              </label>
            </div>

            <div className="form-footer">
              {status === "success" && <span className="form-msg success">Registered successfully.</span>}
              {status === "error" && <span className="form-msg error">{errorMsg}</span>}
              <button type="submit" className="btn btn-primary" disabled={status === "saving"}>
                {status === "saving" ? "Saving..." : "Submit Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
