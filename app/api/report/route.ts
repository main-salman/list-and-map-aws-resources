import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import Report from '@/app/models/Report';

export async function POST(request: Request) {
  try {
    await connectDB();
    const report = await request.json();
    
    // Save the new report
    const newReport = await Report.create(report);

    // Find similar reports
    const similarReports = await Report.find({
      company: { $regex: new RegExp(report.company, 'i') },
      department: report.department ? { $regex: new RegExp(report.department, 'i') } : null,
      _id: { $ne: newReport._id }
    });

    // Get emails of users who opted to share contact info
    const relatedEmails = similarReports
      .filter(r => r.email)
      .map(r => r.email);

    return NextResponse.json({
      success: true,
      similarReports: similarReports.length,
      relatedEmails: report.email ? relatedEmails : [],
    });
  } catch (error) {
    console.error('Error processing report:', error);
    return NextResponse.json(
      { error: 'Failed to process report' },
      { status: 500 }
    );
  }
} 