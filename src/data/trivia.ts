export interface TriviaCard {
  id: string;
  title: string;
  description: string;
  year: number;
  category: "history" | "cinema" | "science" | "general" | "culture" | "custom";
  image: string;
}

export const TRIVIA_DATA: TriviaCard[] = [
  // =========================================================================
  // 1. HISTORY (Civilizational, Dynastic, Freedom Movement & Nationhood)
  // =========================================================================
  {
    id: "hist_1",
    title: "Indus Valley Civilization Peak",
    description: "Planned urban centers like Harappa and Mohenjo-daro reached their peak of bronze-age development.",
    year: -2500,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Mohenjo-daro.jpg/500px-Mohenjo-daro.jpg"
  },
  {
    id: "hist_2",
    title: "Birth of Gautama Buddha",
    description: "Siddhartha Gautama, who went on to attain enlightenment and found Buddhism, was born in Lumbini.",
    year: -563,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Statue_of_Gautama_Buddha_in_Lumbini.jpg/500px-Statue_of_Gautama_Buddha_in_Lumbini.jpg"
  },
  {
    id: "hist_3",
    title: "Battle of the Hydaspes",
    description: "Alexander the Great crossed the Jhelum River and fought King Porus in a historic ancient battle.",
    year: -326,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Alexander_the_Great_%28356-23_BC%29_and_Porus_%28oil_on_canvas%29.jpg/500px-Alexander_the_Great_%28356-23_BC%29_and_Porus_%28oil_on_canvas%29.jpg"
  },
  {
    id: "hist_4",
    title: "Founding of the Mauryan Empire",
    description: "Chandragupta Maurya established the empire with guidance from his legendary advisor Chanakya.",
    year: -321,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Maurya_Empire%2C_c.250_BCE_network_model_v01.png/500px-Maurya_Empire%2C_c.250_BCE_network_model_v01.png"
  },
  {
    id: "hist_5",
    title: "Reign of Emperor Ashoka the Great",
    description: "Ashoka ascended the Mauryan throne and later embraced Buddhism following the Kalinga War.",
    year: -268,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg/500px-Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg"
  },
  {
    id: "hist_6",
    title: "Accession of Kanishka & Saka Era",
    description: "Kushan Emperor Kanishka ascended the throne, marking the inception of the Saka calendar era.",
    year: 78,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/KanishkaCoin3.JPG/500px-KanishkaCoin3.JPG"
  },
  {
    id: "hist_7",
    title: "Golden Age of the Gupta Empire",
    description: "Chandragupta I ascended the throne, initiating an era of immense mathematical and cultural achievements.",
    year: 320,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Map_of_the_Gupta_Empire.png/500px-Map_of_the_Gupta_Empire.png"
  },
  {
    id: "hist_8",
    title: "Chola Maritime Naval Expedition",
    description: "Emperor Rajendra Chola I launched a powerful naval campaign across the Bay of Bengal into Southeast Asia.",
    year: 1025,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/4/4e/Thanjavur_temple.jpg"
  },
  {
    id: "hist_9",
    title: "First Battle of Panipat",
    description: "Babur defeated Ibrahim Lodi at Panipat, establishing the Mughal Empire in North India.",
    year: 1526,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/The_battle_of_Panipat_and_the_death_of_Sultan_Ibr%C4%81h%C4%ABm%2C_the_last_of_the_L%C5%8Dd%C4%AB_Sultans_of_Delhi.jpg/500px-The_battle_of_Panipat_and_the_death_of_Sultan_Ibr%C4%81h%C4%ABm%2C_the_last_of_the_L%C5%8Dd%C4%AB_Sultans_of_Delhi.jpg"
  },
  {
    id: "hist_10",
    title: "Coronation of Chhatrapati Shivaji Maharaj",
    description: "Shivaji Maharaj was crowned King of the Maratha Empire at Raigad Fort.",
    year: 1674,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Shivaji_British_Museum.jpg/500px-Shivaji_British_Museum.jpg"
  },
  {
    id: "hist_11",
    title: "Completion of the Taj Mahal",
    description: "The white marble mausoleum commissioned by Shah Jahan in memory of Mumtaz Mahal was completed.",
    year: 1653,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Taj_Mahal_%28Edited%29.jpeg/500px-Taj_Mahal_%28Edited%29.jpeg"
  },
  {
    id: "hist_12",
    title: "Battle of Plassey",
    description: "British East India Company forces led by Robert Clive defeated Nawab Siraj ud-Daulah of Bengal.",
    year: 1757,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Lord_Clive_meeting_with_Mir_Jafar_after_the_Battle_of_Plassey.jpg/500px-Lord_Clive_meeting_with_Mir_Jafar_after_the_Battle_of_Plassey.jpg"
  },
  {
    id: "hist_13",
    title: "First War of Indian Independence",
    description: "The major uprising against East India Company rule erupted in Meerut and spread across Northern India.",
    year: 1857,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Indian_Rebellion_of_1857.jpg/500px-Indian_Rebellion_of_1857.jpg"
  },
  {
    id: "hist_14",
    title: "Founding of the Indian National Congress",
    description: "Indian political leaders and A.O. Hume established the national organization in Bombay.",
    year: 1885,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Indian_National_Congress_hand_logo.svg/500px-Indian_National_Congress_hand_logo.svg.png"
  },
  {
    id: "hist_15",
    title: "Jallianwala Bagh Massacre",
    description: "British forces under General Dyer opened fire on a peaceful gathering in Amritsar.",
    year: 1919,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Jallianwala_Bagh_in_Day_light.JPG/500px-Jallianwala_Bagh_in_Day_light.JPG"
  },
  {
    id: "hist_16",
    title: "The Dandi Salt March",
    description: "Mahatma Gandhi walked 240 miles to the Dandi seashore to defy the colonial salt tax.",
    year: 1930,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Marche_sel.jpg/500px-Marche_sel.jpg"
  },
  {
    id: "hist_17",
    title: "Quit India Movement Launched",
    description: "Gandhi delivered his famous 'Do or Die' speech demanding an immediate end to British rule.",
    year: 1942,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Quit_india_Movement_Collage.png/500px-Quit_india_Movement_Collage.png"
  },
  {
    id: "hist_18",
    title: "Indian Independence Act",
    description: "India gained freedom from British colonial rule, ending nearly two centuries of foreign governance.",
    year: 1947,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Coat_of_arms_of_the_United_Kingdom_%281901%E2%80%931952%29.svg/500px-Coat_of_arms_of_the_United_Kingdom_%281901%E2%80%931952%29.svg.png"
  },
  {
    id: "hist_19",
    title: "Adoption of the Constitution of India",
    description: "Drafted under Dr. B.R. Ambedkar, the Constitution came into effect, making India a sovereign Republic.",
    year: 1950,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Constitution_of_India.jpg/500px-Constitution_of_India.jpg"
  },
  {
    id: "hist_20",
    title: "Liberation of Goa (Operation Vijay)",
    description: "Indian armed forces integrated Goa into India, ending 451 years of Portuguese colonial presence.",
    year: 1961,
    category: "history",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Operation_Vijay_1961_Goa.jpg/500px-Operation_Vijay_1961_Goa.jpg"
  },

  // =========================================================================
  // 2. SCIENCE & TECHNOLOGY (Scientific Innovations, Space, Supercomputing)
  // =========================================================================
  {
    id: "sci_1",
    title: "Aryabhata's Astronomical Treatise & Zero",
    description: "Mathematician Aryabhata composed the Aryabhatiya, introducing place-value system and rotation of Earth.",
    year: 499,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Aryabhatta_of_Bihar.jpg/500px-Aryabhatta_of_Bihar.jpg"
  },
  {
    id: "sci_2",
    title: "Indian Institute of Science (IISc) Founded",
    description: "Established in Bengaluru with support from Jamsetji Tata and Maharaja Krishnaraja Wadiyar IV.",
    year: 1909,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/IISc_Main_Building.jpg/500px-IISc_Main_Building.jpg"
  },
  {
    id: "sci_3",
    title: "Meghnad Saha Thermal Ionization Equation",
    description: "Astrophysicist Meghnad Saha derived his fundamental equation relating temperature to atomic ionization.",
    year: 1920,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ef/Dr-Meghnad-Saha.jpg"
  },
  {
    id: "sci_4",
    title: "Bose-Einstein Statistics Formulation",
    description: "Satyendra Nath Bose submitted his paper on quantum statistics, paving the way for Bose-Einstein condensates.",
    year: 1924,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/fe/SatyenBose1925.jpg"
  },
  {
    id: "sci_5",
    title: "Discovery of the Raman Effect",
    description: "Sir C.V. Raman discovered light scattering in Kolkata, winning the Nobel Prize in Physics.",
    year: 1928,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Sir_CV_Raman.JPG/500px-Sir_CV_Raman.JPG"
  },
  {
    id: "sci_6",
    title: "Tata Institute of Fundamental Research (TIFR) Founded",
    description: "Dr. Homi J. Bhabha founded India's premier nuclear & theoretical physics laboratory in Mumbai.",
    year: 1945,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Homi_Jehangir_Bhabha_1960s.jpg/500px-Homi_Jehangir_Bhabha_1960s.jpg"
  },
  {
    id: "sci_7",
    title: "First Indian Institute of Technology (IIT Kharagpur)",
    description: "India's premier technological institute was established at Kharagpur, West Bengal.",
    year: 1951,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Entrance_Gate_of_IIT_Kharagpur.jpg/500px-Entrance_Gate_of_IIT_Kharagpur.jpg"
  },
  {
    id: "sci_8",
    title: "Apsara Nuclear Research Reactor Operational",
    description: "Asia's first nuclear research reactor achieved criticality at BARC, Mumbai.",
    year: 1956,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bhabha_Atomic_Research_Centre_Logo.png/500px-Bhabha_Atomic_Research_Centre_Logo.png"
  },
  {
    id: "sci_9",
    title: "First Thumba Sounding Rocket Launch",
    description: "India launched a Nike-Apache sounding rocket from Thumba, Kerala, inaugurating its space program.",
    year: 1963,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Indian_Space_Research_Organisation_Logo.svg/500px-Indian_Space_Research_Organisation_Logo.svg.png"
  },
  {
    id: "sci_10",
    title: "ISRO Established",
    description: "Dr. Vikram Sarabhai founded the Indian Space Research Organisation to harness space technology.",
    year: 1969,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Indian_Space_Research_Organisation_Logo.svg/500px-Indian_Space_Research_Organisation_Logo.svg.png"
  },
  {
    id: "sci_11",
    title: "Smiling Buddha (Pokhran-I Test)",
    description: "India conducted its first successful underground nuclear detonation in Pokhran, Rajasthan.",
    year: 1974,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bhabha_Atomic_Research_Centre_Logo.png/500px-Bhabha_Atomic_Research_Centre_Logo.png"
  },
  {
    id: "sci_12",
    title: "Aryabhata Satellite Launch",
    description: "India's first indigenous artificial satellite was launched into space aboard a Kosmos-3M rocket.",
    year: 1975,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/5/50/Aryabhata_Satellite.jpg"
  },
  {
    id: "sci_13",
    title: "SLV-3 Rohini Satellite Launch",
    description: "India became the 6th spacefaring nation with the successful launch of its indigenous SLV-3 rocket.",
    year: 1980,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Indian_Space_Research_Organisation_Logo.svg/500px-Indian_Space_Research_Organisation_Logo.svg.png"
  },
  {
    id: "sci_14",
    title: "First Indian Antarctic Expedition",
    description: "Scientific expedition team landed in Antarctica, establishing the Dakshin Gangotri research station.",
    year: 1981,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Rakesh_Sharma.jpg/500px-Rakesh_Sharma.jpg"
  },
  {
    id: "sci_15",
    title: "Wing Commander Rakesh Sharma Spaceflight",
    description: "Rakesh Sharma became the first Indian citizen in space aboard Soyuz T-11 to the Salyut 7 space station.",
    year: 1984,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Rakesh_Sharma.jpg/500px-Rakesh_Sharma.jpg"
  },
  {
    id: "sci_16",
    title: "PARAM 8000 Indigenous Supercomputer",
    description: "C-DAC built India's first indigenous supercomputer under the leadership of Dr. Vijay P. Bhatkar.",
    year: 1991,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Bhabha_Atomic_Research_Centre_Logo.png/500px-Bhabha_Atomic_Research_Centre_Logo.png"
  },
  {
    id: "sci_17",
    title: "Pokhran-II (Operation Shakti) Nuclear Tests",
    description: "India conducted five nuclear weapon detonations at Pokhran under Dr. A.P.J. Abdul Kalam.",
    year: 1998,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/A._P._J._Abdul_Kalam.jpg/500px-A._P._J._Abdul_Kalam.jpg"
  },
  {
    id: "sci_18",
    title: "Chandrayaan-1 Lunar Discovery of Water",
    description: "India's first lunar orbiter mission confirmed the existence of water molecules on the Moon's surface.",
    year: 2008,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/CY1_2007_%28cropped%29.jpg/500px-CY1_2007_%28cropped%29.jpg"
  },
  {
    id: "sci_19",
    title: "Mars Orbiter Mission (Mangalyaan)",
    description: "ISRO inserted Mangalyaan into Martian orbit on its maiden attempt, a global spaceflight milestone.",
    year: 2013,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Mars_Orbiter_Mission_Over_Mars_%2815237158879%29.jpg/500px-Mars_Orbiter_Mission_Over_Mars_%2815237158879%29.jpg"
  },
  {
    id: "sci_20",
    title: "Chandrayaan-3 Historic Moon South Pole Landing",
    description: "Vikram lander touched down near the Moon's south pole, making India the 1st country at the lunar south pole.",
    year: 2023,
    category: "science",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Chandrayaan-3_%E2%80%93_Image_of_Vikram_lander_on_lunar_surface_taken_by_Pragyan_rover_navcam_at_1104_IST%2C_30_August_2023_from_15_meters_away_%28with_text%29.webp/500px-Chandrayaan-3_%E2%80%93_Image_of_Vikram_lander_on_lunar_surface_taken_by_Pragyan_rover_navcam_at_1104_IST%2C_30_August_2023_from_15_meters_away_%28with_text%29.webp.png"
  },

  // =========================================================================
  // 3. CINEMA & ARTS (Landmark Indian Films, Oscar Wins, Artistic Milestones)
  // =========================================================================
  {
    id: "cin_1",
    title: "Raja Harishchandra Released",
    description: "Dadasaheb Phalke released India's first full-length silent feature film, pioneering Indian cinema.",
    year: 1913,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/6/6a/Publicity_poster_for_film%2C_Raja_Harishchandra_%281913%29.jpg"
  },
  {
    id: "cin_2",
    title: "Alam Ara (First Indian Sound Talkie Film)",
    description: "Director Ardeshir Irani released India's first sound motion picture, featuring 7 songs.",
    year: 1931,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/f/f5/Alam_Ara_poster%2C_1931.jpg"
  },
  {
    id: "cin_3",
    title: "Neecha Nagar Wins Grand Prix at Cannes",
    description: "Chetan Anand's social-realist film became the first Indian movie awarded at Cannes Film Festival.",
    year: 1946,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Neecha_Nagar_%281946%29.webm/500px--Neecha_Nagar_%281946%29.webm.jpg"
  },
  {
    id: "cin_4",
    title: "Pather Panchali Premiere",
    description: "Satyajit Ray's debut masterpiece brought global international acclaim to parallel Indian cinema.",
    year: 1955,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Satyajit_Ray_in_New_York_%28cropped%29.jpg"
  },
  {
    id: "cin_5",
    title: "Mother India Oscar Nomination",
    description: "Mehboob Khan's epic became the first Indian film nominated for the Academy Award for Best International Feature.",
    year: 1957,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Nargis_in_Mother_India_poster.jpg/500px-Nargis_in_Mother_India_poster.jpg"
  },
  {
    id: "cin_6",
    title: "Mughal-e-Azam Release",
    description: "K. Asif's epic historical drama premiered, setting enduring standards for Indian cinematic spectacle.",
    year: 1960,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Mughal-e-Azam.jpg/500px-Mughal-e-Azam.jpg"
  },
  {
    id: "cin_7",
    title: "Sholay Release",
    description: "Ramesh Sippy's curry western blockbuster set all-time theatrical records across India.",
    year: 1975,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Amitabh_Bachchan_2015.jpg/500px-Amitabh_Bachchan_2015.jpg"
  },
  {
    id: "cin_8",
    title: "Bhanu Athaiya Wins India's First Oscar",
    description: "Bhanu Athaiya won the Academy Award for Best Costume Design for the movie Gandhi.",
    year: 1983,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/2/2a/Bhanu_Athaiya_%28nee_Rajopadhye%29.jpg"
  },
  {
    id: "cin_9",
    title: "Satyajit Ray Honorary Academy Award",
    description: "The Academy of Motion Picture Arts and Sciences conferred an Honorary Oscar on Satyajit Ray for lifetime achievement.",
    year: 1992,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/d/dc/Satyajit_Ray_in_New_York_%28cropped%29.jpg"
  },
  {
    id: "cin_10",
    title: "Dilwale Dulhania Le Jayenge Premiere",
    description: "The romantic landmark film premiered, going on to run continuously for over 1,000 weeks in theaters.",
    year: 1995,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Shah_Rukh_Khan_graces_the_launch_of_the_new_version_of_20_years_of_DDLJ.jpg/500px-Shah_Rukh_Khan_graces_the_launch_of_the_new_version_of_20_years_of_DDLJ.jpg"
  },
  {
    id: "cin_11",
    title: "Lagaan Oscar Nomination",
    description: "Ashutosh Gowariker's sports period drama achieved an Academy Award nomination for Best Foreign Film.",
    year: 2001,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Aamir_Khan_2015.jpg/500px-Aamir_Khan_2015.jpg"
  },
  {
    id: "cin_12",
    title: "A.R. Rahman Double Oscar Victory",
    description: "Composer A.R. Rahman won two Academy Awards (Original Score and Original Song) for Slumdog Millionaire.",
    year: 2009,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg/500px-AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg"
  },
  {
    id: "cin_13",
    title: "Baahubali: The Beginning Release",
    description: "S.S. Rajamouli's epic pan-Indian fantasy film revolutionized Indian cinematic production scale globally.",
    year: 2015,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Prabhas_at_Baahubali_Press_Meet.jpg/500px-Prabhas_at_Baahubali_Press_Meet.jpg"
  },
  {
    id: "cin_14",
    title: "Naatu Naatu Wins Academy Award",
    description: "RRR's song won Best Original Song, becoming the first song from an Indian production to win an Oscar.",
    year: 2023,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/S._S._Rajamouli_at_the_RRR_Press_Meet.jpg/500px-S._S._Rajamouli_at_the_RRR_Press_Meet.jpg"
  },
  {
    id: "cin_15",
    title: "The Elephant Whisperers Oscar Win",
    description: "Kartiki Gonsalves and Guneet Monga won the Academy Award for Best Documentary Short Film.",
    year: 2023,
    category: "cinema",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Poster_Signed_Elephant_Whisperers_Mar23_A7R_04100.jpg/500px-Poster_Signed_Elephant_Whisperers_Mar23_A7R_04100.jpg"
  },

  // =========================================================================
  // 4. CULTURE & HERITAGE (Arts, Literature, Festivals, Crafts & Architecture)
  // =========================================================================
  {
    id: "cul_1",
    title: "Composition of the Natya Shastra",
    description: "Sage Bharata Muni compiled the foundational Sanskrit treatise on classical dance, music, and performing arts.",
    year: -200,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg/500px-Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg"
  },
  {
    id: "cul_2",
    title: "Compilation of the Charaka Samhita",
    description: "Maharishi Charaka authored the foundational medical treatise laying the principles of Ayurveda.",
    year: -300,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Aryabhatta_of_Bihar.jpg/500px-Aryabhatta_of_Bihar.jpg"
  },
  {
    id: "cul_3",
    title: "Kalidasa's Abhijnanashakuntalam Composed",
    description: "Classical Sanskrit poet Kalidasa authored the masterpiece play Shakuntala, celebrated worldwide.",
    year: 400,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Shakuntala_Raja_Ravi_Varma.jpg/500px-Shakuntala_Raja_Ravi_Varma.jpg"
  },
  {
    id: "cul_4",
    title: "Ajanta Caves Mural Masterpieces",
    description: "Ancient Buddhist rock-cut cave monuments featuring masterpiece mural paintings were carved in Maharashtra.",
    year: 200,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Ajanta_%2863%29.jpg/500px-Ajanta_%2863%29.jpg"
  },
  {
    id: "cul_5",
    title: "Construction of Sanchi Stupa",
    description: "Emperor Ashoka commissioned the Great Stupa at Sanchi, one of India's oldest stone Buddhist monuments.",
    year: -250,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg/500px-Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg"
  },
  {
    id: "cul_6",
    title: "Sangam Literature Tamil Assemblies",
    description: "The historic assemblies of Tamil poets and scholars produced the classical Sangam poetry in Madurai.",
    year: 300,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Madurai_Meenakshi_Amman_Temple.jpg/500px-Madurai_Meenakshi_Amman_Temple.jpg"
  },
  {
    id: "cul_7",
    title: "Historical Kumbh Mela Documented",
    description: "Chinese traveler Xuanzang recorded the historic mass spiritual river gathering at Prayagraj.",
    year: 644,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Third_Shahi_Snan_in_Hari_Ki_Pauri.jpg/500px-Third_Shahi_Snan_in_Hari_Ki_Pauri.jpg"
  },
  {
    id: "cul_8",
    title: "Carnatic Music Trinity Era",
    description: "Composers Tyagaraja, Muthuswami Dikshitar, and Syama Sastri formalized South Indian classical music.",
    year: 1767,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg/500px-Shiva_as_the_Lord_of_Dance_LACMA_edit.jpg"
  },
  {
    id: "cul_9",
    title: "Development of Kathakali Dance Drama",
    description: "The dramatic classical dance-form of Kerala featuring elaborate face makeup and mudras originated.",
    year: 1600,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Kathakali_artist_performing.jpg/500px-Kathakali_artist_performing.jpg"
  },
  {
    id: "cul_10",
    title: "Madhubani Folk Art Tradition Origin",
    description: "Women of the Mithila region developed the distinct geometric wall and canvas painting art form.",
    year: 1500,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/%E0%A6%AC%E0%A6%BE%E0%A6%97%E0%A6%AC%E0%A6%BE%E0%A6%9C%E0%A6%BE%E0%A6%B0_%E0%A6%B8%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A8_%E0%A6%A6%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%97%E0%A7%8B%E0%A7%8E%E0%A6%B8%E0%A6%AC_%E0%A7%A8%E0%A7%A6%E0%A7%A7%E0%A7%AE.jpg/500px-%E0%A6%AC%E0%A6%BE%E0%A6%97%E0%A6%AC%E0%A6%BE%E0%A6%9C%E0%A6%BE%E0%A6%B0_%E0%A6%B8%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A8_%E0%A6%A6%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%97%E0%A7%8B%E0%A7%8E%E0%A6%B8%E0%A6%AC_%E0%A7%A8%E0%A7%A6%E0%A7%A7%E0%A7%AE.jpg"
  },
  {
    id: "cul_11",
    title: "Founding of Hampi (Vijayanagara Empire)",
    description: "Brothers Harihara I and Bukka Raya I established Hampi as the grand capital of the Vijayanagara Empire.",
    year: 1336,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Stone_Chariot_Hampi.jpg/500px-Stone_Chariot_Hampi.jpg"
  },
  {
    id: "cul_12",
    title: "Rani ki Vav Stepwell Construction",
    description: "Queen Udayamati constructed the subterranean stepwell architectural masterpiece in Patan, Gujarat.",
    year: 1063,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Rani_ki_vav_04.jpg/500px-Rani_ki_vav_04.jpg"
  },
  {
    id: "cul_13",
    title: "Mysore Dasara Festivities Instituted",
    description: "Raja Wodeyar I inaugurated the grand royal Vijayadashami celebration traditions in Mysore.",
    year: 1610,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Mysore_Palace_Dussera_%2829633564994%29.jpg/500px-Mysore_Palace_Dussera_%2829633564994%29.jpg"
  },
  {
    id: "cul_14",
    title: "Public Durga Puja Pandals Origin",
    description: "Twelve friends in Guptipara, Bengal organized the first community 'Barowari' public Durga Puja.",
    year: 1790,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/%E0%A6%AC%E0%A6%BE%E0%A6%97%E0%A6%AC%E0%A6%BE%E0%A6%9C%E0%A6%BE%E0%A6%B0_%E0%A6%B8%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A8_%E0%A6%A6%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%97%E0%A7%8B%E0%A7%8E%E0%A6%B8%E0%A6%AC_%E0%A7%A8%E0%A7%A6%E0%A7%A7%E0%A7%AE.jpg/500px-%E0%A6%AC%E0%A6%BE%E0%A6%97%E0%A6%AC%E0%A6%BE%E0%A6%9C%E0%A6%BE%E0%A6%B0_%E0%A6%B8%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%9C%E0%A6%A8%E0%A7%80%E0%A6%A8_%E0%A6%A6%E0%A7%81%E0%A6%B0%E0%A7%8D%E0%A6%97%E0%A7%8B%E0%A7%8E%E0%A6%B8%E0%A6%AC_%E0%A7%A8%E0%A7%A6%E0%A7%A7%E0%A7%AE.jpg"
  },
  {
    id: "cul_15",
    title: "Jantar Mantar Jaipur Observatory Built",
    description: "Maharaja Sawai Jai Singh II built the astronomical observatory featuring the world's largest stone sundial.",
    year: 1724,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Buland_Darwaza_Fatehpur_Sikri.jpg/500px-Buland_Darwaza_Fatehpur_Sikri.jpg"
  },
  {
    id: "cul_16",
    title: "Completion of the Red Fort (Lal Qila)",
    description: "Mughal Emperor Shah Jahan completed the massive red sandstone palace fort in Delhi.",
    year: 1648,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Delhi_fort.jpg/500px-Delhi_fort.jpg"
  },
  {
    id: "cul_17",
    title: "Inauguration of Victoria Memorial Kolkata",
    description: "The white marble memorial monument and museum surrounded by gardens opened to the public in Kolkata.",
    year: 1921,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Victoria_Memorial_Kolkata_just_after_sunset.jpg/500px-Victoria_Memorial_Kolkata_just_after_sunset.jpg"
  },
  {
    id: "cul_18",
    title: "Establishment of Fatehpur Sikri",
    description: "Emperor Akbar founded the red sandstone imperial capital city featuring the grand Buland Darwaza.",
    year: 1571,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Buland_Darwaza_Fatehpur_Sikri.jpg/500px-Buland_Darwaza_Fatehpur_Sikri.jpg"
  },
  {
    id: "cul_19",
    title: "Hornbill Festival of Nagaland Instituted",
    description: "The annual 'Festival of Festivals' was inaugurated in Kohima to celebrate Northeast tribal cultural heritage.",
    year: 2000,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Mysore_Palace_Dussera_%2829633564994%29.jpg/500px-Mysore_Palace_Dussera_%2829633564994%29.jpg"
  },
  {
    id: "cul_20",
    title: "Ancient Malabar Spice Trade Route",
    description: "Ancient Indian sea routes exported black pepper, cardamom, and textiles to Rome, Egypt, and Mesopotamia.",
    year: -1000,
    category: "culture",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg/500px-Ashoka%27s_visit_to_the_Ramagrama_stupa_Sanchi_Stupa_1_Southern_gateway.jpg"
  },

  // =========================================================================
  // 5. GENERAL TRIVIA (All-Around Cultural, Literary & Milestones)
  // =========================================================================
  {
    id: "gen_1",
    title: "Establishment of the Indian Postal System",
    description: "The formal postal network was introduced under Lord Dalhousie, laying the groundwork for India Post.",
    year: 1854,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Mahuwal_Mahal_Post_Office_841240.webp/500px-Mahuwal_Mahal_Post_Office_841240.webp.png"
  },
  {
    id: "gen_2",
    title: "First Indian Passenger Railway Train",
    description: "India's first commercial train operated between Bombay (Bori Bunder) and Thane.",
    year: 1853,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Indian_Railways_WAP-7.jpg/500px-Indian_Railways_WAP-7.jpg"
  },
  {
    id: "gen_3",
    title: "Rabindranath Tagore Nobel Prize in Literature",
    description: "Tagore became the first non-European Nobel laureate following the publication of Gitanjali.",
    year: 1913,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/1926_Rabindrath_Tagore.jpg/500px-1926_Rabindrath_Tagore.jpg"
  },
  {
    id: "gen_4",
    title: "Amartya Sen Nobel Prize in Economic Sciences",
    description: "Economist Amartya Sen was awarded the Nobel Prize for his contributions to welfare economics.",
    year: 1998,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/3/35/Amartya_Sen_20071128_cologne_cropped.jpg"
  },
  {
    id: "gen_5",
    title: "Operation Flood (White Revolution) Launched",
    description: "Dr. Verghese Kurien launched the world's largest dairy development program, turning India into a milk surplus nation.",
    year: 1970,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Dr._Verghese_Kurien.jpg/500px-Dr._Verghese_Kurien.jpg"
  },
  {
    id: "gen_6",
    title: "Kolkata Metro Inception",
    description: "India's first underground urban rapid transit metro system opened for public service in Kolkata.",
    year: 1984,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/ICF_MEDHA_MR-416.jpg/500px-ICF_MEDHA_MR-416.jpg"
  },
  {
    id: "gen_7",
    title: "Statue of Unity Inauguration",
    description: "The world's tallest statue (182 meters) depicting Sardar Vallabhbhai Patel was unveiled in Gujarat.",
    year: 2018,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Statue_of_Unity.jpg/500px-Statue_of_Unity.jpg"
  },
  {
    id: "gen_8",
    title: "Kailash Satyarthi Nobel Peace Prize",
    description: "Child rights activist Kailash Satyarthi was awarded the Nobel Peace Prize alongside Malala Yousafzai.",
    year: 2014,
    category: "general",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Kailash_Satyarthi%2C_August_2023.jpg/500px-Kailash_Satyarthi%2C_August_2023.jpg"
  }
];
