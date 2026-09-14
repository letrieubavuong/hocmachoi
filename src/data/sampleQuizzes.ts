import { Quiz } from '../types';

export const SAMPLE_QUIZZES: Quiz[] = [
  {
    id: 'khtn-7-kntt',
    title: '🔬 Khoa Học Tự Nhiên 7 - Thách Thức Chibi',
    subject: 'KHTN 7',
    description: 'Bộ câu hỏi trắc nghiệm KHTN 7 cực hay về Tốc độ, Âm thanh và Quang học!',
    questions: [
      {
        id: 'q1',
        questionText: 'Đơn vị đo tốc độ thường dùng trong đời sống hàng ngày là gì?',
        options: ['m/s hoặc km/h', 'kg hoặc gam', 'Mét (m)', 'Giây (s)'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Đơn vị hợp pháp đo tốc độ là m/s và km/h.'
      },
      {
        id: 'q2',
        questionText: 'Hạt nhân nguyên tử được cấu tạo bởi những hạt nào?',
        options: ['Proton và Neutron', 'Electron và Proton', 'Chỉ có Electron', 'Neutron và Electron'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Hạt nhân nằm ở tâm nguyên tử gồm hạt proton (+) và neutron (không mang điện).'
      },
      {
        id: 'q3',
        questionText: 'Âm thanh KHÔNG thể truyền qua môi trường nào sau đây?',
        options: ['Chân không', 'Chất rắn', 'Chất lỏng', 'Chất khí'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Âm thanh cần môi trường vật chất đàn hồi để truyền đi, trong chân không âm thanh không truyền được.'
      },
      {
        id: 'q4',
        questionText: 'Theo định luật phản xạ ánh sáng, góc phản xạ (i\') so với góc tới (i) như thế nào?',
        options: ['Luôn bằng nhau (i\' = i)', 'Góc phản xạ lớn hơn góc tới', 'Góc phản xạ nhỏ hơn góc tới', 'Tổng bằng 90 độ'],
        correctIndex: 0,
        timeLimit: 20,
        points: 100,
        explanation: 'Định luật phản xạ ánh sáng nêu rõ: Góc phản xạ luôn bằng góc tới (i\' = i).'
      },
      {
        id: 'q5',
        questionText: 'Quá trình quang hợp ở cây xanh tạo ra khí gì cho con người hô hấp?',
        options: ['Khí Ôxi (O₂)', 'Khí Cacbonic (CO₂)', 'Khí Nitơ (N₂)', 'Khí Hydro (H₂)'],
        correctIndex: 20,
        timeLimit: 20,
        points: 100,
        explanation: 'Quang hợp hấp thụ CO2 và giải phóng O2 sinh ra khí oxy nuôi dưỡng sự sống.'
      }
    ]
  },
  {
    id: 'toan-7-bap-cap',
    title: '📐 Đấu Trường Toán 7 - Tháp Số Kỳ Diệu',
    subject: 'Toán Học',
    description: 'Thử thách tư duy logic toán học với chuỗi combo thưởng cực chất!',
    questions: [
      {
        id: 't1',
        questionText: 'Tập hợp các số hữu tỉ được ký hiệu là chữ gì?',
        options: ['Q', 'N', 'Z', 'R'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: 'Số hữu tỉ ký hiệu là Q.'
      },
      {
        id: 't2',
        questionText: 'Kết quả của phép tính (-2)³ là bao nhiêu?',
        options: ['-8', '8', '-6', '6'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: '(-2) * (-2) * (-2) = -8.'
      },
      {
        id: 't3',
        questionText: 'Hai góc đối đỉnh thì có tính chất gì đặc biệt?',
        options: ['Bằng nhau', 'Bù nhau', 'Phụ nhau', 'Vuông góc'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: 'Hai góc đối đỉnh luôn có số đo bằng nhau.'
      },
      {
        id: 't4',
        questionText: 'Tổng số đo 3 góc trong một tam giác luôn bằng bao nhiêu độ?',
        options: ['180°', '360°', '90°', '120°'],
        correctIndex: 0,
        timeLimit: 15,
        points: 100,
        explanation: 'Tổng 3 góc của bất kỳ tam giác nào cũng bằng 180°.'
      }
    ]
  },
  {
    id: 'do-vui-thong-minh',
    title: '🧩 Đố Vui Hack Não & IQ Siêu Cấp',
    subject: 'Giải Trí',
    description: 'Thử thách phản xạ nhanh, tranh giành khiên và điểm số!',
    questions: [
      {
        id: 'dv1',
        questionText: 'Cái gì càng thâu lại càng dài?',
        options: ['Thừng (hoặc Đòn gánh)', 'Bỏ qua', 'Con đường', 'Quả bóng'],
        correctIndex: 0,
        timeLimit: 15,
        points: 120,
        explanation: 'Câu đố dân gian vui!'
      },
      {
        id: 'dv2',
        questionText: 'Nước nào sau đây có hình dạng giống một chiếc ủng trên bản đồ thế giới?',
        options: ['Italia (Ý)', 'Việt Nam', 'Nhật Bản', 'Pháp'],
        correctIndex: 0,
        timeLimit: 15,
        points: 120,
        explanation: 'Bản đồ nước Ý nổi tiếng có hình dáng chiếc ủng cao cổ.'
      },
      {
        id: 'dv3',
        questionText: 'Cái gì bạn có thể cầm ở tay trái nhưng không bao giờ cầm được ở tay phải?',
        options: ['Khuỷu tay phải', 'Quả bóng', 'Cây bút', 'Bàn tay trái'],
        correctIndex: 0,
        timeLimit: 15,
        points: 120,
        explanation: 'Bạn không thể lấy tay phải tự nắm khuỷu tay phải của chính mình!'
      }
    ]
  }
];
