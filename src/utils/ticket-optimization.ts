import { Listing } from '../types/tevo.js';

export interface SmartTicketPresenterParams {
  event_id: number;
  requested_quantity: number;
  budget_per_ticket: number;
  seating_preference: 'budget' | 'premium' | 'mixed' | 'best_value';
  venue_type?: 'arena' | 'stadium' | 'theater' | 'concert_hall' | 'amphitheater' | 'unknown';
  include_explanations?: boolean;
}

export interface TicketRecommendation {
  section: string;
  row: string;
  price_per_ticket: number;
  total_cost: number;
  available_quantity: number;
  format: string;
  instant_delivery: boolean;
  in_hand: boolean;
  notes?: string;
  splits: number[];
  
  // Quality indicators
  seating_tier: 'premium' | 'mid-tier' | 'budget';
  value_score: number; // 0-100 score combining price and quality
  quality_indicators: string[];
  potential_drawbacks: string[];
}

export interface BudgetAnalysis {
  budget_per_ticket: number;
  cheapest_available: number;
  most_expensive_available: number;
  average_price: number;
  budget_utilization_categories: {
    budget: { count: number; price_range: string };
    mid_tier: { count: number; price_range: string };
    premium: { count: number; price_range: string };
  };
  savings_vs_budget: number;
  premium_upgrade_cost: number;
}

export interface SeatingGuidance {
  venue_type: string;
  section_explanations: Array<{
    section_pattern: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;
  general_tips: string[];
}

export interface OptimizedTicketOptions {
  recommendations: TicketRecommendation[];
  budget_analysis: BudgetAnalysis;
  seating_guidance: SeatingGuidance;
}

/**
 * Intelligently optimize ticket selection based on budget and preferences
 * This addresses the core issue of showing only cheapest options
 */
export function optimizeTicketOptions(
  eligibleTickets: Listing[],
  params: SmartTicketPresenterParams,
  eventDetails: any
): OptimizedTicketOptions {
  
  // Sort tickets by price for analysis
  const sortedByPrice = [...eligibleTickets].sort((a, b) => a.retail_price - b.retail_price);
  
  // Calculate budget tiers
  const minPrice = sortedByPrice[0].retail_price;
  const maxPrice = sortedByPrice[sortedByPrice.length - 1].retail_price;
  const budgetRange = params.budget_per_ticket - minPrice;
  
  // Define price tiers based on budget utilization
  const budgetTierThreshold = minPrice + (budgetRange * 0.33);
  const midTierThreshold = minPrice + (budgetRange * 0.67);
  
  // Categorize tickets by tier
  const budgetTier = eligibleTickets.filter(t => t.retail_price <= budgetTierThreshold);
  const midTier = eligibleTickets.filter(t => t.retail_price > budgetTierThreshold && t.retail_price <= midTierThreshold);
  const premiumTier = eligibleTickets.filter(t => t.retail_price > midTierThreshold);
  
  // Generate recommendations based on seating preference
  let recommendations: TicketRecommendation[] = [];
  
  switch (params.seating_preference) {
    case 'budget':
      recommendations = selectBudgetOptions(budgetTier, params);
      break;
    case 'premium':
      recommendations = selectPremiumOptions(premiumTier, midTier, budgetTier, params);
      break;
    case 'best_value':
      recommendations = selectBestValueOptions(eligibleTickets, params);
      break;
    case 'mixed':
    default:
      recommendations = selectMixedOptions(budgetTier, midTier, premiumTier, params);
      break;
  }
  
  // Ensure we don't exceed 5 recommendations, prioritizing diversity
  recommendations = recommendations.slice(0, 5);
  
  // Generate budget analysis
  const budget_analysis: BudgetAnalysis = {
    budget_per_ticket: params.budget_per_ticket,
    cheapest_available: minPrice,
    most_expensive_available: maxPrice,
    average_price: eligibleTickets.reduce((sum, t) => sum + t.retail_price, 0) / eligibleTickets.length,
    budget_utilization_categories: {
      budget: {
        count: budgetTier.length,
        price_range: `$${minPrice}-$${Math.round(budgetTierThreshold)}`
      },
      mid_tier: {
        count: midTier.length,
        price_range: `$${Math.round(budgetTierThreshold + 1)}-$${Math.round(midTierThreshold)}`
      },
      premium: {
        count: premiumTier.length,
        price_range: `$${Math.round(midTierThreshold + 1)}-$${maxPrice}`
      }
    },
    savings_vs_budget: params.budget_per_ticket - minPrice,
    premium_upgrade_cost: maxPrice - minPrice
  };
  
  // Generate seating guidance
  const seating_guidance = generateSeatingGuidance(params.venue_type, eventDetails);
  
  return {
    recommendations,
    budget_analysis,
    seating_guidance
  };
}

function selectBudgetOptions(budgetTier: Listing[], params: SmartTicketPresenterParams): TicketRecommendation[] {
  return budgetTier
    .slice(0, 5)
    .map(ticket => createRecommendation(ticket, 'budget', params));
}

function selectPremiumOptions(
  premiumTier: Listing[], 
  midTier: Listing[], 
  budgetTier: Listing[], 
  params: SmartTicketPresenterParams
): TicketRecommendation[] {
  const recommendations: TicketRecommendation[] = [];
  
  // Start with best premium options
  premiumTier.slice(0, 3).forEach(ticket => {
    recommendations.push(createRecommendation(ticket, 'premium', params));
  });
  
  // Add mid-tier if premium is limited
  if (recommendations.length < 3) {
    midTier.slice(0, 3 - recommendations.length).forEach(ticket => {
      recommendations.push(createRecommendation(ticket, 'mid-tier', params));
    });
  }
  
  // Add budget option for comparison
  if (budgetTier.length > 0) {
    recommendations.push(createRecommendation(budgetTier[0], 'budget', params));
  }
  
  return recommendations;
}

function selectMixedOptions(
  budgetTier: Listing[], 
  midTier: Listing[], 
  premiumTier: Listing[], 
  params: SmartTicketPresenterParams
): TicketRecommendation[] {
  const recommendations: TicketRecommendation[] = [];
  
  // Best value from each tier
  if (budgetTier.length > 0) {
    recommendations.push(createRecommendation(budgetTier[0], 'budget', params));
  }
  
  if (midTier.length > 0) {
    recommendations.push(createRecommendation(midTier[0], 'mid-tier', params));
  }
  
  if (premiumTier.length > 0) {
    recommendations.push(createRecommendation(premiumTier[0], 'premium', params));
  }
  
  // Fill remaining slots with best options from most populated tier
  const remainingSlots = 5 - recommendations.length;
  if (remainingSlots > 0) {
    const largestTier = [budgetTier, midTier, premiumTier]
      .sort((a, b) => b.length - a.length)[0];
    
    largestTier.slice(1, 1 + remainingSlots).forEach(ticket => {
      const tier = getTierForTicket(ticket, budgetTier, midTier, premiumTier);
      recommendations.push(createRecommendation(ticket, tier, params));
    });
  }
  
  return recommendations;
}

function selectBestValueOptions(eligibleTickets: Listing[], params: SmartTicketPresenterParams): TicketRecommendation[] {
  // Calculate value scores for all tickets
  const ticketsWithScores = eligibleTickets.map(ticket => ({
    ticket,
    valueScore: calculateValueScore(ticket, params)
  }));
  
  // Sort by value score and select top 5
  return ticketsWithScores
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 5)
    .map(({ ticket }) => createRecommendation(ticket, 'mid-tier', params)); // Default to mid-tier for value
}

function createRecommendation(ticket: Listing, tier: 'premium' | 'mid-tier' | 'budget', params: SmartTicketPresenterParams): TicketRecommendation {
  const qualityIndicators: string[] = [];
  const potentialDrawbacks: string[] = [];
  
  // Analyze section for quality indicators
  const section = ticket.section?.toLowerCase() || '';
  const row = ticket.row?.toLowerCase() || '';
  
  // Positive indicators
  if (section.includes('floor') || section.includes('pit') || section.match(/^\d{3}$/)) {
    qualityIndicators.push('Floor/Lower level seating');
  }
  if (section.includes('box') || section.includes('suite')) {
    qualityIndicators.push('Premium box/suite seating');
  }
  if (row && (row.includes('1') || row.includes('2') || row.includes('3'))) {
    qualityIndicators.push('Front rows of section');
  }
  if (ticket.instant_delivery) {
    qualityIndicators.push('Instant delivery available');
  }
  if (ticket.in_hand) {
    qualityIndicators.push('Tickets in hand (no delivery risk)');
  }
  
  // Potential drawbacks
  if (section.includes('upper') || section.match(/^[45]\d{2}$/)) {
    potentialDrawbacks.push('Upper level seating');
  }
  if (section.includes('obstructed') || section.includes('limited')) {
    potentialDrawbacks.push('Limited or obstructed view');
  }
  if (section.includes('side') && !section.includes('lower')) {
    potentialDrawbacks.push('Side view seating');
  }
  if (!ticket.instant_delivery && !ticket.in_hand) {
    potentialDrawbacks.push('Check delivery method and timing');
  }
  
  const valueScore = calculateValueScore(ticket, params);
  
  return {
    section: ticket.section || 'N/A',
    row: ticket.row || 'N/A',
    price_per_ticket: ticket.retail_price,
    total_cost: ticket.retail_price * params.requested_quantity,
    available_quantity: ticket.available_quantity,
    format: ticket.format,
    instant_delivery: ticket.instant_delivery,
    in_hand: ticket.in_hand,
    splits: ticket.splits,
    seating_tier: tier,
    value_score: Math.round(valueScore),
    quality_indicators: qualityIndicators,
    potential_drawbacks: potentialDrawbacks,
    notes: generateTicketNotes(ticket, tier, params)
  };
}

function calculateValueScore(ticket: Listing, params: SmartTicketPresenterParams): number {
  let score = 50; // Base score
  
  // Price efficiency (lower price = higher score)
  const priceRatio = ticket.retail_price / params.budget_per_ticket;
  score += (1 - priceRatio) * 30; // Up to 30 points for being under budget
  
  // Section quality indicators
  const section = ticket.section?.toLowerCase() || '';
  if (section.includes('floor') || section.match(/^[12]\d{2}$/)) score += 15;
  if (section.includes('box') || section.includes('suite')) score += 20;
  if (section.includes('upper') || section.match(/^[45]\d{2}$/)) score -= 10;
  if (section.includes('obstructed')) score -= 15;
  
  // Row quality (front rows are better)
  const row = ticket.row?.toLowerCase() || '';
  if (row && (row.includes('1') || row.includes('2'))) score += 10;
  
  // Delivery convenience
  if (ticket.instant_delivery) score += 5;
  if (ticket.in_hand) score += 10;
  
  return Math.max(0, Math.min(100, score));
}

function getTierForTicket(ticket: Listing, budgetTier: Listing[], midTier: Listing[], _premiumTier: Listing[]): 'premium' | 'mid-tier' | 'budget' {
  if (budgetTier.includes(ticket)) return 'budget';
  if (midTier.includes(ticket)) return 'mid-tier';
  return 'premium';
}

function generateTicketNotes(ticket: Listing, tier: 'premium' | 'mid-tier' | 'budget', _params: SmartTicketPresenterParams): string {
  const notes: string[] = [];
  
  switch (tier) {
    case 'premium':
      notes.push('Premium seating option');
      break;
    case 'budget':
      notes.push('Budget-friendly option');
      break;
    case 'mid-tier':
      notes.push('Good balance of price and location');
      break;
  }
  
  const section = ticket.section?.toLowerCase() || '';
  if (section.includes('limited') || section.includes('side')) {
    notes.push('Note: Limited side view');
  }
  
  return notes.join('. ');
}

function generateSeatingGuidance(venue_type?: string, _eventDetails?: any): SeatingGuidance {
  const vType = venue_type || 'unknown';
  
  // Generic guidance that works for most venues
  const baseGuidance: SeatingGuidance = {
    venue_type: vType,
    section_explanations: [
      {
        section_pattern: '100s (Lower Level)',
        description: 'Premium lower level seating closest to the action',
        pros: ['Excellent views', 'Close to stage/field', 'Premium experience'],
        cons: ['Higher prices', 'May require more walking']
      },
      {
        section_pattern: '200s (Upper Level)',
        description: 'Elevated seating with good overview perspective', 
        pros: ['Good value', 'Full view of event', 'Less crowded'],
        cons: ['Further from action', 'Some may have limited views']
      },
      {
        section_pattern: 'Floor/GA',
        description: 'Standing room or floor seating (concerts)',
        pros: ['Closest to performers', 'High energy atmosphere'],
        cons: ['Standing room only', 'May be crowded', 'Limited sight lines']
      }
    ],
    general_tips: [
      'Compare seating charts on venue websites for specific layouts',
      'Consider your priorities: proximity vs. price vs. view quality', 
      'Check reviews for specific sections if available',
      'Factor in accessibility needs and walking distances'
    ]
  };
  
  return baseGuidance;
}