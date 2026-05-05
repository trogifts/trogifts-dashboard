Project Report: Financial Dashboard Module
Project Name: Tro Gifts Management System
Module: Admin Finance Center

1. Introduction
The Financial Dashboard is a core module of the Tro Gifts Admin Panel, designed to provide real-time visibility into the operational cash flow of the business. This module transitions the system from basic order tracking into a comprehensive financial management suite, allowing administrators to track income, record operational expenses, and calculate net profit automatically.

2. Objective
The primary goal of this module is to streamline financial accounting by replacing manual, error-prone bookkeeping with a digital, automated ledger. It ensures that all revenue generated from orders and all expenses incurred (e.g., crafter payouts, raw materials, marketing) are tracked in a centralized, secure database.

3. Technology Stack
Frontend: React.js
Styling and UI: Tailwind CSS (for responsive, glassmorphic design), Lucide React (for iconography)
PDF Generation: jspdf and jspdf-autotable (for client-side report generation)
Backend API: Google Apps Script
Database: Google Sheets (acts as a lightweight, accessible NoSQL database)

4. Key Features and Implementation

4.1 Real-Time Hero Metrics
The dashboard prominently displays two critical metrics:
- Orders Total Amount: Calculates the gross expected revenue from all active customer orders.
- Bank Balance (Profit): A dynamic calculation of (Total Income Deposits) minus (Total Expenses). The UI uses animated number counters to provide a fluid user experience.

4.2 Interactive Expense Ledger
The core of the financial center is the Expense Ledger, which supports full CRUD (Create, Read, Update, Delete) operations.
- Visual Categorization: Entries are color-coded (Green for Income, Red for Expenses) to allow administrators to assess cash flow at a glance.
- Dynamic Filtering: Users can filter the ledger by specific categories (e.g., Printing, Post Office, Marketing, Income Only) to analyze specific spending areas.
- Context-Aware Modals: When adding or editing a record, the input modal dynamically changes its color theme based on whether an Income or Expense category is selected.

4.3 PDF Export and Reporting
To facilitate offline record-keeping and formal accounting, the module integrates a one-click PDF download feature.
- Using jspdf-autotable, the system parses the currently visible (filtered) ledger and generates a formatted, striped table.
- The generated report includes a localized timestamp and a calculated summary footer displaying Total Expenses and Net Bank Balance.

4.4 Data Synchronization and Backend
The frontend React application communicates securely with a Google Apps Script deployment. 
- Edit and Delete Logic: The Apps Script iterates through the specific Google Sheet tab (Expenses), locates the exact unique row ID, and performs atomic updates or deletions. This ensures the frontend UI and the Google Sheet remain perfectly synchronized without requiring page reloads.

5. Conclusion
The Financial Dashboard module successfully modernizes the administrative workflow. By combining a highly aesthetic, responsive user interface with robust data handling and reporting tools, the system provides a scalable solution for managing the financial health of the Tro Gifts platform.
