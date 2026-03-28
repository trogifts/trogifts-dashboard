function doPost(e) {
  // CORS configuration
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'register') {
      return handleRegister(data, headers);
    } else if (action === 'login') {
      return handleLogin(data, headers);
    } else if (action === 'createOrder') {
      return handleCreateOrder(data, headers);
    } else if (action === 'updateOrderStatus') {
      return ContentService.createTextOutput(JSON.stringify(handleUpdateOrderStatus(data))).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'submitPayout') {
      return ContentService.createTextOutput(JSON.stringify(handleSubmitPayout(data))).setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'updateCrafterStatus') {
      return handleUpdateCrafterStatus(data, headers);
    } else {
      return errorResponse('Invalid action', headers);
    }
  } catch (error) {
    return errorResponse(error.toString(), headers);
  }
}

function doGet(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };
  
  if (!e.parameter.action) {
    return successResponse({status: 'API is running. Please use POST for data mutations or specify an action for GET.'}, headers);
  }
  
  const action = e.parameter.action;
  
  try {
    if (action === 'getOrders') {
      return handleGetOrders(e.parameter, headers);
    } else if (action === 'getCrafters') {
      return handleGetCrafters(headers);
    } else if (action === 'getDashboardStats') {
      return handleGetDashboardStats(e.parameter, headers);
    }
  } catch (error) {
    return errorResponse(error.toString(), headers);
  }
}

// OPTIONS request handler for CORS preflight
function doOptions(e) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}

// ----------------- Handlers -----------------

function handleRegister(data, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return errorResponse('Users sheet not found', headers);
  
  const referralId = 'REF_' + Math.floor(1000 + Math.random() * 9000);
  const userId = new Date().getTime().toString();
  
  // Columns: ID, Role, Name, Email, Phone, Password, Referral_ID, Status
  sheet.appendRow([userId, 'crafter', data.name, data.email, data.phone, data.password, referralId, 'Pending Validation']);
  
  return successResponse({
    uid: userId,
    role: 'crafter',
    name: data.name,
    email: data.email,
    referral_id: referralId
  }, headers);
}

function handleLogin(data, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return errorResponse('Users sheet not found', headers);
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 0; i < rows.length; i++) {
    // Columns: ID (0), Role (1), Name (2), Email (3), Phone (4), Password (5), Referral_ID (6), Status (7)
    if ((rows[i][3] == data.email || rows[i][4] == data.phone) && rows[i][5] == data.password) {
      if (rows[i][1] === 'crafter' && rows[i][7] !== 'Active') {
        return errorResponse('Your account is pending approval by the Tro Gifts team. You can log in once approved.', headers);
      }
      return successResponse({
        uid: rows[i][0],
        role: rows[i][1],
        name: rows[i][2],
        email: rows[i][3],
        referral_id: rows[i][6]
      }, headers);
    }
  }
  return errorResponse('Invalid credentials', headers);
}

function handleCreateOrder(data, headers) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    if (!sheet) return errorResponse('Orders sheet not found', headers);
    
    // Generate unique order ID
    const orderId = 'ORD-' + Math.floor(10000 + Math.random() * 90000);
    
    let photoUrls = [];
    let finalPhotoString = '';
    let currentGroup = '';

    if (data.files && data.files.length > 0) {
      for (const f of data.files) {
        if (f.groupTitle && f.groupTitle !== currentGroup) {
          currentGroup = f.groupTitle;
          if (finalPhotoString.length > 0) finalPhotoString += '\n'; // Add space between previous
          finalPhotoString += `--- ${currentGroup} ---\n`;
        }
        let url = uploadFileToDrive(f.base64, f.name, f.mimeType);
        finalPhotoString += url + '\n';
      }
    } else if (data.fileBase64) {
      finalPhotoString = uploadFileToDrive(data.fileBase64, data.customerName + '_' + data.fileName, data.mimeType);
    }
    let paymentUrl = '';
    if (data.paymentFileBase64) {
      paymentUrl = uploadFileToDrive(data.paymentFileBase64, 'PAYMENT_' + data.customerName + '_' + data.paymentFileName, data.paymentMimeType);
    }
    
    // Columns: [0]Order_ID, [1]Crafter_Ref, [2]Customer, [3]Address, [4]Template, [5]Transaction_ID, [6]Status, [7]Photo_URL, [8]Design_URL, [9]Date, [10]Delivery_Method, [11]Quantity, [12]Price, [13]Commission, [14]Payment_URL
    sheet.appendRow([
      orderId, 
      data.referralId, 
      data.customerName, 
      data.address, 
      data.template, 
      data.transactionId, 
      'Order Placed', 
      finalPhotoString, 
      '', 
      new Date(),
      data.deliveryMethod,
      data.quantity,
      data.price,
      data.commission,
      paymentUrl
    ]);
    
    return successResponse({ success: true, orderId }, headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
}
function handleGetOrders(params, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sheet) return errorResponse('Orders sheet not found', headers);
  
  const rows = sheet.getDataRange().getValues();
  const orders = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const order = {
      id: row[0],
      crafterId: row[1],
      customerName: row[2],
      address: row[3],
      template: row[4],
      transactionId: row[5],
      status: row[6],
      photoUrl: row[7],
      designUrl: row[8],
      date: typeof row[9] === 'object' ? row[9].toISOString().split('T')[0] : row[9],
      deliveryMethod: row[10],
      quantity: row[11],
      price: row[12],
      commission: row[13],
      paymentUrl: row[14]
    };
    
    // If getting for specific crafter, filter
    if (params.crafterId && order.crafterId !== params.crafterId) {
      continue;
    }
    orders.push(order);
  }
  
  return successResponse({ orders }, headers);
}

function handleUpdateOrderStatus(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sheet) return { success: false, error: 'Sheet not found' };
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.orderId) {
      sheet.getRange(i + 1, 7).setValue(data.status);
      return { success: true };
    }
  }
  return { success: false, error: 'Order not found' };
}

function handleSubmitPayout(data) {
  let payoutSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Payouts');
  if (!payoutSheet) {
    payoutSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Payouts');
    payoutSheet.appendRow(['Payout_ID', 'Crafter_Ref', 'Amount', 'Date']);
  }
  const pid = 'PAY-' + Math.floor(10000 + Math.random() * 90000);
  payoutSheet.appendRow([pid, data.crafterId, data.amount, new Date()]);
  return { success: true };
}

function handleUpdateCrafterStatus(data, headers) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (!sheet) return errorResponse('Users sheet not found', headers);
    
    const rows = sheet.getDataRange().getValues();
    for (let i = 0; i < rows.length; i++) {
        if (rows[i][0] == data.crafterId) {
            sheet.getRange(i + 1, 8).setValue(data.status); // 8th col is Status
            return successResponse({ success: true, crafterId: data.crafterId, status: data.status }, headers);
        }
    }
    return errorResponse('Crafter not found', headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
}

function handleGetDashboardStats(params, headers) {
  const orderSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if(!orderSheet) return successResponse({totalOrders:0, totalEarnings:'₹0', pendingPayout:'₹0', paidEarnings:'₹0'}, headers);
  
  let totalOrders = 0;
  let totalEarningsNum = 0;
  let deliveredEarningsNum = 0;

  const rows = orderSheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    // Col 1 is Crafter_Ref
    if (params.crafterId && rows[i][1] === params.crafterId) {
      totalOrders++;
      const comm = parseFloat(rows[i][13]) || 0;
      totalEarningsNum += comm;
      if (rows[i][6] === 'Delivered') {
        deliveredEarningsNum += comm;
      }
    } else if (!params.crafterId && rows[i][0] && rows[i][0].toString().startsWith('ORD')) {
      // Global admin stats logic (if used elsewhere)
      totalOrders++;
      const comm = parseFloat(rows[i][13]) || 0;
      totalEarningsNum += comm;
      if (rows[i][6] === 'Delivered') {
        deliveredEarningsNum += comm;
      }
    }
  }

  let paidEarningsNum = 0;
  let payoutSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Payouts');
  
  if (!payoutSheet) {
    payoutSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Payouts');
    payoutSheet.appendRow(['Payout_ID', 'Crafter_Ref', 'Amount', 'Date']);
  } else {
    const pRows = payoutSheet.getDataRange().getValues();
    for (let i = 1; i < pRows.length; i++) {
      if (params.crafterId && pRows[i][1] === params.crafterId) {
        paidEarningsNum += parseFloat(pRows[i][2]) || 0;
      } else if (!params.crafterId) {
        paidEarningsNum += parseFloat(pRows[i][2]) || 0;
      }
    }
  }

  let pendingPayoutNum = deliveredEarningsNum - paidEarningsNum;
  if (pendingPayoutNum < 0) pendingPayoutNum = 0;

  return successResponse({
    totalOrders: totalOrders,
    totalEarnings: '₹' + totalEarningsNum,
    pendingPayout: '₹' + pendingPayoutNum,
    paidEarnings: '₹' + paidEarningsNum
  }, headers);
}


function handleGetCrafters(headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return errorResponse('Users sheet not found', headers);
  
  const rows = sheet.getDataRange().getValues();
  const crafters = [];
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'crafter') {
      crafters.push({
        id: rows[i][0],
        name: rows[i][2],
        email: rows[i][3],
        referral: rows[i][6],
        status: rows[i][7],
        ordersCount: 'N/A'
      });
    }
  }
  return successResponse({ crafters }, headers);
}

// ----------------- Helpers -----------------

function uploadFileToDrive(base64Data, filename, mimeType) {
  // Get or Create generic 'TroGifts_IncomingPhoto' folder
  const folderName = "TroGifts_IncomingPhoto";
  let folders = DriveApp.getFoldersByName(folderName);
  let folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  const decodedData = Utilities.base64Decode(base64Data.split(',')[1]); 
  const blob = Utilities.newBlob(decodedData, mimeType, filename);
  const file = folder.createFile(blob);
  
  // Make file readable to anyone with link
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

function successResponse(data, headers) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
    // Note: Apps script automatically handles normal setMimeType
}

function errorResponse(msg, headers) {
  return ContentService.createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
