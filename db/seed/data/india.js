/*
 * India-specific reference data.
 *
 * Plutus serves Indian financial advisors, so the seeded records have to read like
 * an Indian advisor's book of business: real cities with pincodes from their actual
 * ranges, names drawn from several regions rather than one, and fund houses and
 * schemes that exist. Placeholder values (Lorem Ipsum, "Test Contact 4") make every
 * screen built on them impossible to evaluate.
 */

// Surnames span north, south, east and west rather than clustering in one region.
const SURNAMES = [
  'Sharma', 'Verma', 'Gupta', 'Agarwal', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia',
  'Mehta', 'Shah', 'Patel', 'Desai', 'Joshi', 'Trivedi', 'Bhatt', 'Pandya',
  'Reddy', 'Rao', 'Naidu', 'Iyer', 'Iyengar', 'Krishnan', 'Subramanian', 'Menon',
  'Nair', 'Pillai', 'Kurup', 'Warrier', 'Banerjee', 'Chatterjee', 'Mukherjee',
  'Ganguly', 'Bose', 'Dutta', 'Sen', 'Ghosh', 'Deshpande', 'Kulkarni', 'Joshi',
  'Patil', 'Jadhav', 'Shinde', 'Gaikwad', 'Singh', 'Chauhan', 'Rathore', 'Shekhawat',
  'Bedi', 'Gill', 'Sandhu', 'Dhillon', 'Ahluwalia', 'Khanna', 'Saxena', 'Srivastava',
  'Mishra', 'Tiwari', 'Dubey', 'Pandey', 'Chaturvedi', 'Bajaj', 'Goenka', 'Jain',
];

const MALE_FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Reyansh', 'Krishna', 'Ishaan',
  'Rohan', 'Karan', 'Rahul', 'Amit', 'Sanjay', 'Rajesh', 'Vikram', 'Suresh',
  'Ramesh', 'Anil', 'Sunil', 'Manoj', 'Deepak', 'Ashok', 'Prakash', 'Naveen',
  'Siddharth', 'Nikhil', 'Varun', 'Kunal', 'Gaurav', 'Harsh', 'Yash', 'Dev',
  'Aryan', 'Kabir', 'Aditya', 'Pranav', 'Sameer', 'Tarun', 'Mohit', 'Ankit',
  'Abhishek', 'Rakesh', 'Vinod', 'Mahesh', 'Girish', 'Sudhir', 'Alok', 'Nitin',
];

const FEMALE_FIRST_NAMES = [
  'Aadhya', 'Ananya', 'Diya', 'Ishita', 'Kavya', 'Meera', 'Navya', 'Pari',
  'Riya', 'Saanvi', 'Tara', 'Zara', 'Aditi', 'Anjali', 'Deepika', 'Divya',
  'Gayatri', 'Kirti', 'Lakshmi', 'Madhuri', 'Neha', 'Nisha', 'Pooja', 'Priya',
  'Radhika', 'Rekha', 'Sangeeta', 'Shalini', 'Shreya', 'Sneha', 'Sunita', 'Swati',
  'Vandana', 'Vidya', 'Nandini', 'Kalpana', 'Rupali', 'Manisha', 'Payal', 'Ritu',
];

const MIDDLE_NAMES = ['Kumar', 'Prasad', 'Chandra', 'Nath', 'Devi', 'Rani', 'Lal', 'Mohan'];

/*
 * Cities with a pincode from the range actually used by that city, so an address
 * does not read as nonsense to anyone who knows the country. state is carried for
 * building street addresses; the city table itself only stores name and country.
 */
const CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', pincodes: ['400001', '400020', '400050', '400070'] },
  { name: 'Delhi', state: 'Delhi', pincodes: ['110001', '110016', '110024', '110048'] },
  { name: 'Bengaluru', state: 'Karnataka', pincodes: ['560001', '560034', '560066', '560103'] },
  { name: 'Hyderabad', state: 'Telangana', pincodes: ['500001', '500032', '500081'] },
  { name: 'Chennai', state: 'Tamil Nadu', pincodes: ['600001', '600020', '600042'] },
  { name: 'Kolkata', state: 'West Bengal', pincodes: ['700001', '700019', '700091'] },
  { name: 'Pune', state: 'Maharashtra', pincodes: ['411001', '411014', '411045'] },
  { name: 'Ahmedabad', state: 'Gujarat', pincodes: ['380001', '380015', '380054'] },
  { name: 'Jaipur', state: 'Rajasthan', pincodes: ['302001', '302017', '302020'] },
  { name: 'Surat', state: 'Gujarat', pincodes: ['395001', '395007'] },
  { name: 'Lucknow', state: 'Uttar Pradesh', pincodes: ['226001', '226010'] },
  { name: 'Chandigarh', state: 'Chandigarh', pincodes: ['160001', '160017'] },
  { name: 'Indore', state: 'Madhya Pradesh', pincodes: ['452001', '452010'] },
  { name: 'Kochi', state: 'Kerala', pincodes: ['682001', '682016'] },
  { name: 'Coimbatore', state: 'Tamil Nadu', pincodes: ['641001', '641014'] },
  { name: 'Nagpur', state: 'Maharashtra', pincodes: ['440001', '440010'] },
  { name: 'Bhopal', state: 'Madhya Pradesh', pincodes: ['462001', '462016'] },
  { name: 'Vadodara', state: 'Gujarat', pincodes: ['390001', '390007'] },
  { name: 'Thiruvananthapuram', state: 'Kerala', pincodes: ['695001', '695014'] },
  { name: 'Gurugram', state: 'Haryana', pincodes: ['122001', '122018'] },
  { name: 'Noida', state: 'Uttar Pradesh', pincodes: ['201301', '201309'] },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', pincodes: ['530001', '530017'] },
];

const STREET_NAMES = [
  'MG Road', 'Nehru Nagar', 'Gandhi Marg', 'Linking Road', 'Brigade Road',
  'Park Street', 'Anna Salai', 'FC Road', 'CG Road', 'Residency Road',
  'Sector 17', 'Jubilee Hills', 'Banjara Hills', 'Koramangala 5th Block',
  'Indiranagar 100ft Road', 'Andheri West', 'Powai Lake View', 'Salt Lake Sector V',
  'Civil Lines', 'Model Town', 'Vasant Kunj', 'Aundh', 'Kalyani Nagar',
];

const BUILDING_NAMES = [
  'Shanti Apartments', 'Green Acres', 'Sai Residency', 'Lotus Towers', 'Rose Villa',
  'Silver Oak', 'Palm Grove', 'Sunrise Heights', 'Orchid Enclave', 'Maple Court',
  'Gokul Dham', 'Riverdale', 'Sterling Homes', 'Whispering Palms',
];

// Professions typical of an Indian advisory client base.
const PROFESSIONS = [
  'Software Engineer', 'Doctor', 'Chartered Accountant', 'Business Owner',
  'Bank Manager', 'Civil Servant', 'Lawyer', 'Architect', 'Professor',
  'School Teacher', 'Consultant', 'Pharmacist', 'Dentist', 'Civil Engineer',
  'Marketing Manager', 'Sales Executive', 'Journalist', 'Interior Designer',
  'Retired', 'Homemaker', 'Farmer', 'Restaurateur', 'Real Estate Developer',
  'Merchant Navy Officer', 'Airline Pilot', 'Defence Personnel',
];

// Matches the values the contact form offers.
const RESIDENCE_STATUSES = [
  'Resident',
  'Non resident Indian',
  'Overseas Citizen of India',
  'Foreign National',
];

// India's two mutual fund registrars and transfer agents.
const REGISTRARS = [
  {
    name: 'CAMS',
    address: 'New No 10, Old No 178, MGR Salai, Nungambakkam, Chennai 600034',
    contactNumber: '+914428283838',
    contactPerson: 'Lakshmi Narayanan',
    email: 'service@camsonline.com',
  },
  {
    name: 'KFin Technologies',
    address: 'Selenium Building, Tower B, Gachibowli, Hyderabad 500032',
    contactNumber: '+914067162222',
    contactPerson: 'Vivek Mathur',
    email: 'service@kfintech.com',
  },
];

/*
 * Real asset management companies and a representative scheme from each, so holdings
 * read as a genuine book of business rather than "Fund A, Fund B". The names are
 * recognisable to anyone who has worked in the sector.
 */
const FUND_HOUSES = [
  {
    company: 'HDFC Mutual Fund',
    schemes: [
      'HDFC Flexi Cap Fund - Direct - Growth',
      'HDFC Balanced Advantage Fund - Direct - Growth',
      'HDFC Mid-Cap Opportunities Fund - Direct - Growth',
      'HDFC Short Term Debt Fund - Direct - Growth',
    ],
  },
  {
    company: 'SBI Mutual Fund',
    schemes: [
      'SBI Bluechip Fund - Direct - Growth',
      'SBI Small Cap Fund - Direct - Growth',
      'SBI Equity Hybrid Fund - Direct - Growth',
      'SBI Magnum Gilt Fund - Direct - Growth',
    ],
  },
  {
    company: 'ICICI Prudential Mutual Fund',
    schemes: [
      'ICICI Prudential Bluechip Fund - Direct - Growth',
      'ICICI Prudential Value Discovery Fund - Direct - Growth',
      'ICICI Prudential Corporate Bond Fund - Direct - Growth',
    ],
  },
  {
    company: 'Axis Mutual Fund',
    schemes: [
      'Axis Long Term Equity Fund - Direct - Growth',
      'Axis Midcap Fund - Direct - Growth',
      'Axis Liquid Fund - Direct - Growth',
    ],
  },
  {
    company: 'Nippon India Mutual Fund',
    schemes: [
      'Nippon India Small Cap Fund - Direct - Growth',
      'Nippon India Growth Fund - Direct - Growth',
      'Nippon India Liquid Fund - Direct - Growth',
    ],
  },
  {
    company: 'Kotak Mahindra Mutual Fund',
    schemes: [
      'Kotak Emerging Equity Fund - Direct - Growth',
      'Kotak Flexicap Fund - Direct - Growth',
    ],
  },
  {
    company: 'Mirae Asset Mutual Fund',
    schemes: [
      'Mirae Asset Large Cap Fund - Direct - Growth',
      'Mirae Asset Emerging Bluechip Fund - Direct - Growth',
    ],
  },
];

// Product categories a distributor actually transacts in.
const PRODUCTS = [
  'Equity Mutual Fund',
  'Debt Mutual Fund',
  'Hybrid Mutual Fund',
  'Liquid Fund',
  'Term Insurance',
  'Health Insurance',
  'ULIP',
  'Public Provident Fund',
  'National Pension System',
  'Fixed Deposit',
  'Sovereign Gold Bond',
  'Portfolio Management Service',
];

const BROKERS = [
  { code: 'ARN-11223', name: 'Prudent Wealth Distributors', type: 'Distributor' },
  { code: 'ARN-44556', name: 'NJ IndiaInvest', type: 'Distributor' },
  { code: 'ARN-77889', name: 'Anand Rathi Wealth', type: 'Distributor' },
  { code: 'RIA-00341', name: 'Direct - Registered Investment Adviser', type: 'RIA' },
];

const DEAL_STAGES = [
  'Prospecting',
  'Needs Analysis',
  'Proposal Sent',
  'Negotiation',
  'Closed Won',
  'Closed Lost',
];

const TRANSACTION_MODES = ['Lumpsum', 'SIP', 'STP', 'SWP', 'Switch', 'Redemption'];

const BANKS = [
  'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank',
  'Punjab National Bank', 'Bank of Baroda', 'IndusInd Bank', 'Yes Bank', 'Canara Bank',
];

module.exports = {
  SURNAMES,
  MALE_FIRST_NAMES,
  FEMALE_FIRST_NAMES,
  MIDDLE_NAMES,
  CITIES,
  STREET_NAMES,
  BUILDING_NAMES,
  PROFESSIONS,
  RESIDENCE_STATUSES,
  REGISTRARS,
  FUND_HOUSES,
  PRODUCTS,
  BROKERS,
  DEAL_STAGES,
  TRANSACTION_MODES,
  BANKS,
};
