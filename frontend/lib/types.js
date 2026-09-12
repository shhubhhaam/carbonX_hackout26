/**
 * @fileoverview JSDoc type definitions for all CarbonX domain entities.
 * Replace service functions with real API calls when backend is ready.
 */

/**
 * @typedef {Object} Facility
 * @property {string} id
 * @property {string} name
 * @property {string} sector
 * @property {string} location
 * @property {string} country
 * @property {string} reportingPeriod
 * @property {number} production
 * @property {string} productionUnit
 * @property {number} totalEmissions
 * @property {number} emissionIntensity
 * @property {number} dataCompleteness
 * @property {'active'|'inactive'} status
 * @property {string} lat
 * @property {string} lng
 */

/**
 * @typedef {Object} Process
 * @property {string} id
 * @property {string} facilityId
 * @property {string} name
 * @property {string} type
 * @property {number} emissions
 * @property {number} contribution
 */

/**
 * @typedef {Object} EmissionRecord
 * @property {string} month
 * @property {number} scope1
 * @property {number} scope2
 * @property {number} scope3
 * @property {number} total
 * @property {number} intensity
 */

/**
 * @typedef {Object} Hotspot
 * @property {string} id
 * @property {string} facilityId
 * @property {string} process
 * @property {string} source
 * @property {number} emissions
 * @property {number} contribution
 * @property {string} trend
 * @property {boolean} anomaly
 * @property {number} opportunityScore
 * @property {'critical'|'high'|'medium'|'low'} priority
 * @property {string} description
 */

/**
 * @typedef {Object} Stream
 * @property {string} id
 * @property {string} name
 * @property {string} facilityId
 * @property {string} facilityName
 * @property {'organic'|'chemical'|'biomass'|'captured-co2'|'ash'} type
 * @property {number} quantity
 * @property {string} unit
 * @property {number} available
 * @property {number} reserved
 * @property {'available'|'matched'|'allocated'|'dispatched'|'verified'|'closed'} status
 * @property {string} generatedDate
 * @property {string} expiryDate
 * @property {string} description
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} id
 * @property {string} streamId
 * @property {string} title
 * @property {'reduce'|'recover'|'reuse'|'recycle'|'substitute'|'process-change'} category
 * @property {number} co2Benefit
 * @property {number} cost
 * @property {number} savings
 * @property {number} circularity
 * @property {number} feasibility
 * @property {number} confidence
 * @property {string} reason
 * @property {string} pathway
 */

/**
 * @typedef {Object} Partner
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} location
 * @property {number} distance
 * @property {number} capacity
 * @property {number} compatibility
 * @property {number} costValue
 * @property {number} transportEmissions
 * @property {number} fitScore
 * @property {string} reason
 * @property {string} contact
 */

/**
 * @typedef {Object} Pathway
 * @property {string} id
 * @property {string} name
 * @property {string} streamId
 * @property {string} partnerId
 * @property {string} partnerName
 * @property {number} co2Benefit
 * @property {number} circularity
 * @property {number} economicValue
 * @property {number} feasibility
 * @property {number} logistics
 * @property {number} distance
 * @property {number} transportEmissions
 * @property {number} cost
 * @property {number} revenue
 * @property {number} payback
 * @property {number} overallScore
 * @property {boolean} rejected
 * @property {string} [rejectedReason]
 * @property {'landfill'|'composting'|'biogas'|'biochar'} type
 */

/**
 * @typedef {Object} Allocation
 * @property {string} id
 * @property {string} streamId
 * @property {string} partnerId
 * @property {string} partnerName
 * @property {number} quantity
 * @property {string} unit
 * @property {string} allocatedDate
 * @property {'pending'|'confirmed'|'dispatched'|'received'|'verified'} status
 */

/**
 * @typedef {Object} LifecycleEvent
 * @property {string} id
 * @property {string} streamId
 * @property {string} event
 * @property {string} timestamp
 * @property {string} actor
 * @property {number} quantity
 * @property {string} unit
 * @property {string} location
 * @property {string} evidenceRef
 * @property {'confirmed'|'pending'|'disputed'} status
 */

/**
 * @typedef {Object} Evidence
 * @property {string} id
 * @property {string} streamId
 * @property {string} type
 * @property {string} description
 * @property {string} uploadedBy
 * @property {string} uploadedDate
 * @property {'verified'|'pending'|'rejected'} status
 * @property {string} url
 */

/**
 * @typedef {Object} VerifiedOutcome
 * @property {string} id
 * @property {string} streamId
 * @property {string} streamName
 * @property {number} co2Avoided
 * @property {string} verifiedDate
 * @property {string} verifier
 * @property {'verified'|'requires-review'|'pending'} status
 * @property {string[]} checklist
 * @property {string[]} issues
 */
