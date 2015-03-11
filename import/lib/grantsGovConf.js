var eligibleApplicants = 
    [['State Government','0','State governments'],
    ['County Government','1','County governments'],
    ['Local Government','2','City or township governments'],
    ['Local Government','4','Special district governments'],
    ['Educational Organization','5','Independent school districts'],
    ['Public Institution','6','Public and State controlled institutions of higher education'],
    ['Tribal Government','7','Native American tribal governments (Federally recognized)'],
    ['Other','11','Native American tribal organizations (other than Federally recognized tribal governments)'],
    ['Nonprofit','12','"Nonprofits having a 501(c)(3) status with the IRS',' other than institutions of higher education"'],
    ['Nonprofit','13','"Nonprofits that do not have a 501(c)(3) status with the IRS',' other than institutions of higher education"'],
    ['Private Institution','20','Private institutions of higher education'],
    ['Individual','21','Individuals'],
    ['Business','22','For profit organizations other than small businesses'],
    ['Business','23','Small businesses'],
    ['Special Group','25','Others (see text field entitled Additional Information on Eligibility for clarification)'],
    ['Other','99','"Unrestricted (i.e.',' open to any type of entity above)',' subject to any clarification in text field entitled Additional Information on Eligibility"']];

var organizationBlacklist = 
    ['Agency for International Development','Department of Veterans Affairs','Department of Health and Human Services'];

var titleWordBlacklist = 
    ['DO NOT','TEST','FY09','FY2009','FY 2010','FY 2009','Atlantic','Great Lakes','Gulf Oil Spill','Food Safety','Elderly',
    'Alabama','Alaska','Arizona','Arkansas','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana',
    'Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana',
    'Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma',
    'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia',
    'West Virginia','Wisconsin','Wyoming', 'WY'];

var category = 
    [['cat','description','category'],
    ['AG','Agriculture','Agriculture'],
    ['BC','Business and Commerce','Business and Commerce'],
    ['CD','Sustainable Community','Urban Development'],
    ['CP','Consumer Protection','Education'],
    ['DPR','Disaster Prevention and Relief',''],
    ['ED','Education','Education'],
    ['ELT','Employment, Labor and Training','Education'],
    ['EN','Energy','Energy'],
    ['ENV','Environmental Quality','Natural Resources Management'],
    ['FN','Food and Nutrition',''],
    ['HL','Health','Public Health'],
    ['HO','Housing',''],
    ['HU','Humanities',''],
    ['ISS','Income Security and Social Services',''],
    ['IS','Information and Statistics',''],
    ['LJL','Law, Justice and Legal Services',''],
    ['NR','Natural Resources Management','Natural Resources Management'],
    ['O','Other',''],
    ['RA','Recovery Act',''],
    ['RD','Regional Development','Urban Development'],
    ['ST','Science and Technology and other Research and Development','Education'],
    ['T','Transportation','Transportation']];

var assistanceType =
    [['G','Grant'],
    ['CA','Grant'],
    ['O','Other'],
    ['PC','Other']];


// process arrays
var hash = {}, row;
for( var i = 0; i < eligibleApplicants.length; i++ ) {
    row = eligibleApplicants[i];
    hash[row[1]] = {
        wgca : row[0],
        grantsGov : row[2]
    }
}
eligibleApplicants = hash;

hash = {};
for( var i = 0; i < category.length; i++ ) {
    row = category[i];
    hash[row[0]] = {
        wgca : row[2],
        grantsGov : row[1]
    }
}
category = hash;

hash = {};
for( var i = 0; i < assistanceType.length; i++ ) {
    hash[assistanceType[i][0]] = assistanceType[i][1]
}
assistanceType = hash;

exports.config = {
    eligibleApplicants : eligibleApplicants,
    categories : category,
    assistanceTypes : assistanceType,
    blacklist : {
        organizations : organizationBlacklist,
        titleWords : titleWordBlacklist
    }
}