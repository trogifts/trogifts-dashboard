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
    } else if (action === 'uploadDesign') {
      return handleUploadDesign(data, headers);
    } else if (action === 'uploadPhoto') {
      return handleUploadPhoto(data, headers);
    } else if (action === 'imageKitAuth') {
      return handleImageKitAuth(headers);
    } else if (action === 'updateOrderPhotos') {
      return handleUpdateOrderPhotos(data, headers);
    } else if (action === 'submitPayout') {
      return successResponse(handleSubmitPayout(data), headers);
    } else if (action === 'updateCrafterStatus') {
      return handleUpdateCrafterStatus(data, headers);
    } else if (action === 'addExpense') {
      return handleAddExpense(data, headers);
    } else if (action === 'deleteExpense') {
      return handleDeleteExpense(data, headers);
    } else if (action === 'editExpense') {
      return handleEditExpense(data, headers);
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
    } else if (action === 'getExpenses') {
      return handleGetExpenses(headers);
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
    
    // Use frontend-generated order ID if provided, otherwise generate a new one
    const orderId = data.expectedOrderId || ('ORD-' + Math.floor(10000 + Math.random() * 90000));
    
    // Columns: [0]Order_ID, [1]Crafter_Ref, [2]Customer, [3]Address, [4]Template, [5]Transaction_ID, [6]Status, [7]Photo_URL, [8]Design_URL, [9]Date, [10]Delivery_Method, [11]Quantity, [12]Price, [13]Commission, [14]Payment_URL
    sheet.appendRow([
      orderId, 
      data.referralId, 
      data.customerName, 
      data.address, 
      data.template, 
      data.transactionId, 
      'Order Placed', 
      data.finalPhotoString || '', // Prefetched frontend formatted string
      '', 
      new Date(),
      data.deliveryMethod,
      data.quantity,
      data.price,
      data.commission,
      data.paymentUrl || '' // Prefetched frontend payment string
    ]);
    
    return successResponse({ success: true, orderId }, headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
}
function handleGetOrders(params, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return errorResponse('Orders sheet not found', headers);
  
  // Build lookup map for crafter phones
  const phoneMap = {};
  if (userSheet) {
    const uRows = userSheet.getDataRange().getValues();
    for (let u = 1; u < uRows.length; u++) {
      phoneMap[uRows[u][6]] = uRows[u][4]; // Referral_ID -> Phone
    }
  }
  
  const rows = sheet.getDataRange().getValues();
  const orders = [];
  
  for (let i = 1; i < rows.length; i++) {
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
      paymentUrl: row[14],
      crafterPhone: phoneMap[row[1]] || ''
    };
    
    // If getting for specific crafter, filter
    if (params.crafterId && order.crafterId !== params.crafterId) {
      continue;
    }
    orders.push(order);
  }
    orders.reverse();
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

function handleUploadDesign(data, headers) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    if (!sheet) return errorResponse('Orders sheet not found', headers);
    
    let url;
    let newUrlStr;
    
    if (data.previewBase64) {
        // New dual-upload method
        const origUrl = uploadFileToDrive(data.fileBase64, data.fileName, data.mimeType, 'TroGifts_CompletedDesigns');
        url = uploadFileToDrive(data.previewBase64, "preview_" + data.fileName, data.mimeType, 'TroGifts_CompletedDesigns');
        newUrlStr = data.photoTitle ? `--- ${data.photoTitle} ---\n[ORIG] ${origUrl}\n${url}` : `[ORIG] ${origUrl}\n${url}`;
    } else {
        // Legacy fallback
        url = uploadFileToDrive(data.fileBase64, data.fileName, data.mimeType, 'TroGifts_CompletedDesigns');
        newUrlStr = data.photoTitle ? `--- ${data.photoTitle} ---\n${url}` : url;
    }
    
    // Find order and update Col 9 (Design URL) and Status (Col 7)
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.orderId) {
            let existing = data.existingDesignUrl || sheet.getRange(i + 1, 9).getValue() || "";
            let finalStr = existing && data.photoTitle ? existing + "\n" + newUrlStr : newUrlStr;
            
            sheet.getRange(i + 1, 9).setValue(finalStr);
            sheet.getRange(i + 1, 7).setValue('Waiting for Approval');
            return successResponse({ success: true, finalUrl: finalStr, orderId: data.orderId, status: 'Waiting for Approval' }, headers);
        }
    }
    return errorResponse('Order not found', headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
}

// ImageKit Integration Auth Generator
function handleImageKitAuth(headers) {
  var privateKey = "private_iObSFKYv8L8AYuSmyelfvJW/yMM=";
  var token = Utilities.getUuid();
  var expire = Math.floor(Date.now() / 1000) + 60 * 30; // 30 mins
  
  var signatureBytes = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, token + expire, privateKey);
  
  var signature = signatureBytes.map(function(byte) {
    var v = (byte < 0 ? 256 + byte : byte).toString(16);
    return v.length == 1 ? '0' + v : v;
  }).join('');
  
  return successResponse({
    token: token,
    expire: expire,
    signature: signature
  }, headers);
}

function handleUploadPhoto(data, headers) {
  try {
    const url = uploadFileToDrive(data.fileBase64, data.fileName, data.mimeType, 'TroGifts_IncomingPhoto');
    return successResponse({ success: true, url: url, identifier: data.identifier }, headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
}

function handleUpdateOrderPhotos(data, headers) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    if (!sheet) return errorResponse('Orders sheet not found', headers);
    
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.orderId) {
            sheet.getRange(i + 1, 8).setValue(data.photoUrlString); // Index 7, Col 8 is Photo_URL
            sheet.getRange(i + 1, 7).setValue('Order Placed'); // Reset status safely
            return successResponse({ success: true, orderId: data.orderId }, headers);
        }
    }
    return errorResponse('Order not found', headers);
  } catch (error) {
    return errorResponse(error.message, headers);
  }
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
  if(!orderSheet) return successResponse({totalOrders:0, totalEarnings:'₹0', pendingPayout:'₹0', paidEarnings:'₹0', pendingApprovals:0, activeCrafters:0}, headers);
  
  let totalOrders = 0;
  let totalEarningsNum = 0;
  let deliveredEarningsNum = 0;
  let pendingApprovals = 0;

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
      // Global admin stats logic
      totalOrders++;
      totalEarningsNum += parseFloat(rows[i][12]) || 0; // Admin tracks Revenue
    }
  }

  let activeCrafters = 0;
  pendingApprovals = 0; // Reset for crafter calculations
  if (!params.crafterId) {
    const userSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    if (userSheet) {
       const uRows = userSheet.getDataRange().getValues();
       for(let j=1; j<uRows.length; j++) {
           if (uRows[j][1] === 'crafter') {
               if (uRows[j][7] === 'Active') {
                   activeCrafters++;
               } else if (uRows[j][7] === 'Pending Validation') {
                   pendingApprovals++;
               }
           }
       }
    }
  }

  let paidEarningsNum = 0;
  let recentPayouts = [];
  let payoutSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Payouts');
  
  if (!payoutSheet) {
    payoutSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Payouts');
    payoutSheet.appendRow(['Payout_ID', 'Crafter_Ref', 'Amount', 'Date']);
  } else {
    const pRows = payoutSheet.getDataRange().getValues();
    for (let i = 1; i < pRows.length; i++) {
        const amt = parseFloat(pRows[i][2]) || 0;
        if (params.crafterId && pRows[i][1] === params.crafterId) {
            paidEarningsNum += amt;
            recentPayouts.push({
                id: pRows[i][0],
                amount: amt,
                date: typeof pRows[i][3] === 'object' ? pRows[i][3].toISOString().split('T')[0] : pRows[i][3]
            });
        } else if (!params.crafterId) {
            paidEarningsNum += amt;
        }
    }
  }

  // Sort descending
  recentPayouts.sort((a,b) => new Date(b.date) - new Date(a.date));

  let pendingPayoutNum = deliveredEarningsNum - paidEarningsNum;
  if (pendingPayoutNum < 0) pendingPayoutNum = 0;

  return successResponse({
    totalOrders: totalOrders,
    totalEarnings: '₹' + totalEarningsNum,
    pendingPayout: '₹' + pendingPayoutNum,
    paidEarnings: '₹' + paidEarningsNum,
    pendingApprovals: pendingApprovals,
    activeCrafters: activeCrafters,
    history: recentPayouts
  }, headers);
}


function handleGetCrafters(headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
  if (!sheet) return errorResponse('Users sheet not found', headers);
  
  const orderSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  const orderRows = orderSheet ? orderSheet.getDataRange().getValues() : [];
  
  const payoutSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Payouts');
  const payoutRows = payoutSheet ? payoutSheet.getDataRange().getValues() : [];
  
  const rows = sheet.getDataRange().getValues();
  const crafters = [];
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][1] === 'crafter') {
      const refId = rows[i][6];
      let deliveredEarnings = 0;
      for (let j = 1; j < orderRows.length; j++) {
         if (orderRows[j][1] === refId && orderRows[j][6] === 'Delivered') {
            deliveredEarnings += parseFloat(orderRows[j][13]) || 0;
         }
      }
      
      let paidEarnings = 0;
      for (let k = 1; k < payoutRows.length; k++) {
         if (payoutRows[k][1] === refId) {
             paidEarnings += parseFloat(payoutRows[k][2]) || 0;
         }
      }
      
      let pendingPayout = deliveredEarnings - paidEarnings;
      if (pendingPayout < 0) pendingPayout = 0;
      
      crafters.push({
        id: rows[i][0],
        name: rows[i][2],
        email: rows[i][3],
        referral: refId,
        status: rows[i][7],
        pendingPayout: pendingPayout
      });
    }
  }
  return successResponse({ crafters }, headers);
}

// ----------------- Helpers -----------------

function uploadFileToDrive(base64Data, filename, mimeType, folderName = "TroGifts_IncomingPhoto") {
  // Get or Create folder
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

// ----------------- Finances & Expenses -----------------

function handleGetExpenses(headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Expenses');
  if (!sheet) return errorResponse('Expenses sheet not found. Please create one.', headers);
  
  const rows = sheet.getDataRange().getValues();
  const expenses = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    expenses.push({
      id: rows[i][0],
      date: typeof rows[i][1] === 'object' ? rows[i][1].toISOString().split('T')[0] : rows[i][1],
      category: rows[i][2],
      amount: rows[i][3],
      description: rows[i][4]
    });
  }
  expenses.reverse();
  return successResponse({ expenses }, headers);
}

function handleAddExpense(data, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Expenses');
  if (!sheet) return errorResponse('Expenses sheet not found. Please create one.', headers);
  
  const newId = 'EXP-' + Math.floor(10000 + Math.random() * 90000);
  
  sheet.appendRow([
    newId,
    data.date,
    data.category,
    data.amount,
    data.description || ''
  ]);
  
  return successResponse({ success: true, id: newId }, headers);
}

function handleDeleteExpense(data, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Expenses');
  if (!sheet) return errorResponse('Expenses sheet not found', headers);
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return successResponse({ success: true }, headers);
    }
  }
  return errorResponse('Expense not found', headers);
}

function handleEditExpense(data, headers) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Expenses');
  if (!sheet) return errorResponse('Expenses sheet not found', headers);
  
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.getRange(i + 1, 2).setValue(data.date);
      sheet.getRange(i + 1, 3).setValue(data.category);
      sheet.getRange(i + 1, 4).setValue(data.amount);
      sheet.getRange(i + 1, 5).setValue(data.description || '');
      return successResponse({ success: true }, headers);
    }
  }
  return errorResponse('Expense not found', headers);
}
