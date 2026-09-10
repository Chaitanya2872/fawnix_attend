"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteAccountCard = DeleteAccountCard;
var useAccountDeletion_1 = require("../../account-deletion/hooks/useAccountDeletion");
function DeleteAccountCard() {
    var _a = (0, useAccountDeletion_1.useAccountDeletion)(), empCode = _a.empCode, otp = _a.otp, status = _a.status, isLoading = _a.isLoading, setEmpCode = _a.setEmpCode, setOtp = _a.setOtp, requestOtp = _a.requestOtp, deleteAccount = _a.deleteAccount;
    return (<div className="delete-card">
      <div>
        <label htmlFor="emp-code">Employee ID</label>
        <input id="emp-code" type="text" placeholder="e.g., 2872" value={empCode} onChange={function (event) { return setEmpCode(event.target.value); }}/>
      </div>
      <div>
        <label htmlFor="otp">OTP</label>
        <input id="otp" type="text" placeholder="Enter OTP" value={otp} onChange={function (event) { return setOtp(event.target.value); }}/>
      </div>
      <div className="delete-actions">
        <button className="ghost" onClick={function () { return void requestOtp(); }} disabled={isLoading} type="button">
          Request OTP
        </button>
        <button className="danger" onClick={function () { return void deleteAccount(); }} disabled={isLoading} type="button">
          Delete Account
        </button>
      </div>
      {status ? <p className="delete-note">{status}</p> : null}
    </div>);
}
