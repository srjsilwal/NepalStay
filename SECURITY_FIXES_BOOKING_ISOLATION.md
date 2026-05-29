# 🔒 Security Fixes: Booking Data Isolation

## Issue Summary
Data leakage vulnerability where vendors could potentially see bookings from other vendors' hotels.

## Vulnerabilities Found & Fixed

### 1. **GET /api/bookings** - List bookings (CRITICAL)
**File**: `app/api/bookings/route.ts`

**Vulnerability**:
```typescript
// BEFORE (VULNERABLE)
if (user.role === "VENDOR") {
  const hotel = await prisma.hotel.findUnique({
    where: { vendorId: user.id },
  });
  if (hotel) where.hotelId = hotel.id;
  // ❌ If hotel is null, where object is empty → vendor sees ALL bookings!
}
```

**Fix Applied**:
```typescript
// AFTER (FIXED)
if (user.role === "VENDOR") {
  const hotel = await prisma.hotel.findUnique({
    where: { vendorId: user.id },
    select: { id: true },
  });
  if (!hotel) {
    // ✅ Explicitly return empty list if vendor has no hotel
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
    });
  }
  where.hotelId = hotel.id;
}
```

**Impact**: 
- ❌ Before: Vendor without hotel or if query fails → sees all bookings
- ✅ After: Vendor without hotel → explicitly returns empty list

---

### 2. **GET /api/bookings/[id]** - Fetch single booking (CRITICAL)
**File**: `app/api/bookings/[id]/route.ts`

**Vulnerability**:
```typescript
// BEFORE (VULNERABLE)
const user = session.user as any;
if (user.role === "CUSTOMER" && booking.userId !== user.id) {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}
// ❌ No check for VENDOR role! Vendor can access any booking by ID
```

**Fix Applied**:
```typescript
// AFTER (FIXED)
const user = session.user as any;

// ✅ Customers can only view their own bookings
if (user.role === "CUSTOMER" && booking.userId !== user.id) {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

// ✅ Vendors can only view bookings for their own hotel
if (user.role === "VENDOR" && booking.hotel.vendorId !== user.id) {
  return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
}

// ✅ Staff can only view bookings for their assigned hotel
if (user.role === "STAFF") {
  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { staffHotelId: true, isActive: true },
  });
  if (!staffUser?.isActive || staffUser.staffHotelId !== booking.hotelId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }
}
```

**Impact**:
- ❌ Before: Vendor1 could call `/api/bookings/booking-from-vendor2` and access it
- ✅ After: Vendor1 gets 403 Forbidden when trying to access Vendor2's bookings

---

### 3. **GET /api/bookings** - Staff member isolation
**File**: `app/api/bookings/route.ts`

**Vulnerability**:
```typescript
// BEFORE (VULNERABLE)
if (user.role === "STAFF") {
  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
  });
  if (staffUser?.staffHotelId) {
    where.hotelId = staffUser.staffHotelId;
  }
  // ❌ If staff has no assigned hotel or is inactive, they see ALL bookings!
}
```

**Fix Applied**:
```typescript
// AFTER (FIXED)
if (user.role === "STAFF") {
  const staffUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { staffHotelId: true, isActive: true },
  });
  if (!staffUser?.staffHotelId || !staffUser.isActive) {
    // ✅ Explicitly return empty list if staff has no hotel or is inactive
    return NextResponse.json({
      success: true,
      data: [],
      total: 0,
    });
  }
  where.hotelId = staffUser.staffHotelId;
}
```

**Impact**:
- ❌ Before: Disabled or unassigned staff → sees all bookings
- ✅ After: Disabled or unassigned staff → sees empty list

---

## Security Checklist: Already Secure ✅

The following endpoints were already properly secured:

| Endpoint | File | Status |
|----------|------|--------|
| POST /api/bookings/{id}/refund | `app/api/bookings/[id]/refund/route.ts` | ✅ Checks `booking.hotel.vendorId === user.id` |
| POST /api/vendor/invoice | `app/api/vendor/invoice/route.ts` | ✅ Checks `booking.hotel.vendor.id === vendorId` |
| GET /api/vendor/analytics | `app/api/vendor/analytics/route.ts` | ✅ Filters by `hotelId: hotel.id` |
| PUT/DELETE /api/vendor/rooms/[id] | `app/api/vendor/rooms/[id]/route.ts` | ✅ Uses `ownsRoom()` helper function |
| PATCH /api/bookings/[id] | `app/api/bookings/[id]/route.ts` | ✅ Proper role-based checks |

---

## Testing Recommendations

### Test Case 1: Vendor cannot access other vendor's bookings
```bash
# Vendor1 tries to list Vendor2's bookings
GET /api/bookings?limit=50
# Expected: Returns only Vendor1's bookings

# Vendor1 tries to access Vendor2's specific booking
GET /api/bookings/booking-from-vendor2
# Expected: 403 Forbidden
```

### Test Case 2: Staff isolation
```bash
# Disabled staff member tries to list bookings
GET /api/bookings
# Expected: { success: true, data: [], total: 0 }

# Unassigned staff member tries to list bookings
GET /api/bookings
# Expected: { success: true, data: [], total: 0 }

# Active assigned staff lists bookings
GET /api/bookings
# Expected: Only bookings for their assigned hotel
```

### Test Case 3: Customer isolation
```bash
# Customer tries to access other customer's booking
GET /api/bookings/booking-from-other-customer
# Expected: 403 Forbidden
```

---

## Summary of Changes

| Component | Change | Severity |
|-----------|--------|----------|
| Vendor booking list | Return empty list if no hotel | Critical |
| Vendor single booking | Add vendorId check | Critical |
| Staff booking list | Return empty list if inactive/unassigned | High |
| Staff single booking | Add hotel assignment check | High |

---

## Files Modified
1. `app/api/bookings/route.ts` - Fixed GET endpoint with proper isolation
2. `app/api/bookings/[id]/route.ts` - Added vendor and staff checks to GET endpoint

All changes ensure that vendors can only see bookings for their own hotel, and staff can only see bookings for their assigned hotel.
