import { NextResponse } from "next/server";

export async function GET() {
  const headers = ["name", "email", "phone", "whatsapp_number", "company", "source", "notes"];
  const sample = [
    ["Amit Sharma", "amit@techcorp.com", "+919876543210", "+919876543210", "TechCorp", "Website", "Interested in enterprise plan"],
    ["Pooja Nair", "pooja@designhub.in", "+918765432109", "", "Design Hub", "Referral", "Follow up next week"],
    ["Raj Mehta", "", "+917654321098", "+917654321098", "StartupXYZ", "Ads", ""],
  ];

  const csvContent = [headers, ...sample]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="leads_sample.csv"',
    },
  });
}