import { Download, Printer, X } from 'lucide-react';
import type {
  CustomerAccount,
  DealOpportunity,
  OrganizationSettings,
  PayrollRecord,
} from '../shared/types';
import { formatMoney } from '../utils/formatters';

export type VoucherPayload =
  | { kind: 'payslip'; record: PayrollRecord }
  | { kind: 'invoice'; customer?: CustomerAccount; deal?: DealOpportunity };

interface DocumentVoucherModalProps {
  voucher: VoucherPayload | null;
  orgSettings: OrganizationSettings;
  onClose: () => void;
}

export function DocumentVoucherModal({
  voucher,
  orgSettings,
  onClose,
}: DocumentVoucherModalProps) {
  if (!voucher) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  function handlePrint() {
    window.print();
  }

  function handleDownloadHtml() {
    const el = document.getElementById('printable-voucher-sheet');
    if (!el) return;
    const docTitle =
      voucher?.kind === 'payslip'
        ? `Payslip-${voucher.record.employeeName}-${voucher.record.periodMonth}`
        : `Invoice-${voucher?.customer?.companyName || voucher?.deal?.companyName || 'Client'}`;
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${docTitle}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; padding: 32px; max-width: 820px; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 10px 8px; text-align: left; font-size: 13px; }
  .right { text-align: right; font-family: monospace; }
</style>
</head>
<body>${el.innerHTML}</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle.replace(/\s+/g, '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Invoice calculation if kind === 'invoice'
  const invCompany =
    voucher.kind === 'invoice'
      ? voucher.customer?.companyName || voucher.deal?.companyName || 'Enterprise Client'
      : '';
  const invContact =
    voucher.kind === 'invoice'
      ? voucher.customer?.contactName || 'Accounts Payable'
      : '';
  const invEmail =
    voucher.kind === 'invoice'
      ? voucher.customer?.contactEmail || `billing@${orgSettings.companyDomain}`
      : '';
  const invSubtotal =
    voucher.kind === 'invoice'
      ? voucher.deal?.valueUsd ?? voucher.customer?.arrUsd ?? 0
      : 0;
  const invTax = Math.round(invSubtotal * ((orgSettings.defaultTaxRatePct || 0) / 100));
  const invTotal = invSubtotal + invTax;
  const invNumber =
    voucher.kind === 'invoice'
      ? `INV-${(voucher.deal?.id || voucher.customer?.id || '1001').slice(-4).toUpperCase()}-${todayStr.replace(/-/g, '')}`
      : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full overflow-hidden shadow-xl my-4 sm:my-8">
        {/* Modal Action Bar (hidden when printing) */}
        <div className="no-print px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-xs font-semibold text-slate-800">
            {voucher.kind === 'payslip'
              ? 'Official Salary Payslip Voucher'
              : 'Official Commercial Invoice'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close voucher"
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div id="printable-voucher-sheet" className="p-4 sm:p-8 space-y-6 text-slate-900">
          {/* Brand Letterhead */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-5 border-b border-slate-200">
            <div className="min-w-0">
              <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                {orgSettings.companyName}
              </div>
              <div className="text-xs text-slate-500 mt-1">{orgSettings.companyAddress}</div>
              <div className="text-xs text-slate-500 break-words">
                {orgSettings.supportEmail} · {orgSettings.companyDomain}
              </div>
            </div>
            <div className="sm:text-right font-mono tabular-nums shrink-0">
              <div className="text-sm font-bold text-slate-900">
                {voucher.kind === 'payslip' ? 'SALARY PAYSLIP' : 'COMMERCIAL INVOICE'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Ref: {voucher.kind === 'payslip' ? voucher.record.id.toUpperCase() : invNumber}
              </div>
              <div className="text-xs text-slate-500">Date: {todayStr}</div>
            </div>
          </div>

          {voucher.kind === 'payslip' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 sm:gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-1">
                  <div className="text-slate-500">Employee Name</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {voucher.record.employeeName}
                  </div>
                  <div className="text-slate-600">
                    {voucher.record.role} · {voucher.record.department}
                  </div>
                </div>
                <div className="space-y-1 sm:text-right print:text-right font-mono tabular-nums">
                  <div className="text-slate-500">Payroll Period</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {voucher.record.periodMonth}
                  </div>
                  <div className="text-emerald-700 font-medium">
                    Status: {voucher.record.status}
                  </div>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500">
                    <th className="py-2.5">Compensation Component</th>
                    <th className="py-2.5 text-right">Amount ({orgSettings.currencyCode})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 font-medium text-slate-800">Monthly Base Salary</td>
                    <td className="py-3 text-right font-mono tabular-nums">
                      {formatMoney(voucher.record.baseSalaryUsd, orgSettings)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-slate-800">
                      KPI Retention & Closed-Won Deal Commission Bonus
                    </td>
                    <td className="py-3 text-right font-mono tabular-nums text-emerald-700">
                      +{formatMoney(voucher.record.performanceBonusUsd, orgSettings)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-slate-800">Income Tax Withheld</td>
                    <td className="py-3 text-right font-mono tabular-nums text-red-700">
                      -{formatMoney(voucher.record.taxDeductionUsd, orgSettings)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-900 font-bold text-sm">
                    <td className="py-3.5 text-slate-900">Net Take-Home Payable</td>
                    <td className="py-3.5 text-right font-mono tabular-nums text-slate-900">
                      {formatMoney(voucher.record.netPayUsd, orgSettings)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 sm:gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="space-y-1 min-w-0">
                  <div className="text-slate-500">Bill To</div>
                  <div className="text-sm font-semibold text-slate-900">{invCompany}</div>
                  <div className="text-slate-600 break-words">
                    Attn: {invContact} ({invEmail})
                  </div>
                </div>
                <div className="space-y-1 sm:text-right print:text-right font-mono tabular-nums">
                  <div className="text-slate-500">Contract / Renewal Due</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {voucher.deal?.expectedCloseDate || voucher.customer?.renewalDate || todayStr}
                  </div>
                  <div className="text-slate-600">Currency: {orgSettings.currencyCode}</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500">
                    <th className="py-2.5 pr-2">Description / Subscription Scope</th>
                    <th className="py-2.5 text-right whitespace-nowrap">Amount ({orgSettings.currencyCode})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3.5 pr-3">
                      <div className="font-semibold text-slate-900">
                        {voucher.deal
                          ? `${voucher.deal.title} (${voucher.deal.dealType})`
                          : `${invCompany} — Annual Enterprise Platform Subscription & SLA Support`}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        Includes dedicated account specialist routing, SLA coverage ({orgSettings.slaTargetHours}h response target), and retention analytics.
                      </div>
                    </td>
                    <td className="py-3.5 text-right font-mono tabular-nums font-medium whitespace-nowrap">
                      {formatMoney(invSubtotal, orgSettings)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-slate-600">
                      VAT / Tax ({orgSettings.defaultTaxRatePct}%)
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {formatMoney(invTax, orgSettings)}
                    </td>
                  </tr>
                  <tr className="border-t-2 border-slate-900 font-bold text-sm">
                    <td className="py-3.5 text-slate-900">Total Amount Due</td>
                    <td className="py-3.5 text-right font-mono tabular-nums text-slate-900 whitespace-nowrap">
                      {formatMoney(invTotal, orgSettings)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          <div className="pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-6 sm:gap-8 text-xs text-slate-500">
            <div className="border-t border-slate-300 pt-2">
              Authorized Signatory · {orgSettings.companyName}
            </div>
            <div className="border-t border-slate-300 pt-2 sm:text-right print:text-right">
              Recipient Acknowledgment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
