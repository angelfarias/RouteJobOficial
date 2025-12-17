import { Injectable } from '@nestjs/common';
import { CategoriesService } from './categories.service';

@Injectable()
export class CategorySeeder {
  constructor(private readonly categoriesService: CategoriesService) {}

  async seedJobCategories(): Promise<void> {
    console.log('🌱 Starting job categories seeding...');

    try {
      // Main job categories with comprehensive subcategories
      const categories = [
        {
          name: 'Tecnología e Informática',
          description: 'Empleos relacionados con tecnología, desarrollo de software, sistemas y telecomunicaciones',
          children: [
            { name: 'Desarrollo de Software', description: 'Programación, desarrollo web, móvil y de aplicaciones' },
            { name: 'Análisis de Sistemas', description: 'Análisis, diseño y arquitectura de sistemas' },
            { name: 'Bases de Datos', description: 'Administración y desarrollo de bases de datos' },
            { name: 'Redes y Telecomunicaciones', description: 'Administración de redes, telecomunicaciones e infraestructura' },
            { name: 'Ciberseguridad', description: 'Seguridad informática, ethical hacking y protección de datos' },
            { name: 'Inteligencia Artificial', description: 'Machine Learning, Data Science y AI' },
            { name: 'DevOps y Cloud', description: 'Administración de servidores, cloud computing y automatización' },
            { name: 'UX/UI Design', description: 'Diseño de experiencia de usuario e interfaces' },
            { name: 'Testing y QA', description: 'Pruebas de software y aseguramiento de calidad' },
            { name: 'Soporte Técnico', description: 'Soporte técnico y help desk' }
          ]
        },
        {
          name: 'Ventas y Comercial',
          description: 'Empleos en ventas, atención al cliente y desarrollo comercial',
          children: [
            { name: 'Ventas Directas', description: 'Vendedores, ejecutivos de ventas y representantes comerciales' },
            { name: 'Ventas Online', description: 'E-commerce, ventas digitales y marketing online' },
            { name: 'Atención al Cliente', description: 'Call center, servicio al cliente y soporte' },
            { name: 'Retail', description: 'Ventas en tiendas, supermercados y centros comerciales' },
            { name: 'Ventas B2B', description: 'Ventas empresariales y corporativas' },
            { name: 'Telemarketing', description: 'Ventas telefónicas y telemercadeo' },
            { name: 'Inmobiliaria', description: 'Corredores de propiedades y ventas inmobiliarias' },
            { name: 'Automotriz', description: 'Ventas de vehículos y repuestos automotrices' }
          ]
        },
        {
          name: 'Administración y Finanzas',
          description: 'Empleos en administración, contabilidad, finanzas y recursos humanos',
          children: [
            { name: 'Contabilidad', description: 'Contadores, auditores y asistentes contables' },
            { name: 'Finanzas', description: 'Analistas financieros, tesorería y control de gestión' },
            { name: 'Recursos Humanos', description: 'Reclutamiento, capacitación y gestión de personal' },
            { name: 'Administración General', description: 'Asistentes administrativos y secretarias' },
            { name: 'Logística', description: 'Gestión de inventarios, bodega y distribución' },
            { name: 'Compras', description: 'Compradores, abastecimiento y procurement' },
            { name: 'Planificación', description: 'Planificación estratégica y control de gestión' },
            { name: 'Legal', description: 'Abogados, asesores legales y compliance' }
          ]
        },
        {
          name: 'Salud y Medicina',
          description: 'Empleos en el sector salud, medicina y cuidado de personas',
          children: [
            { name: 'Enfermería', description: 'Enfermeros, técnicos en enfermería y auxiliares' },
            { name: 'Medicina', description: 'Médicos generales y especialistas' },
            { name: 'Odontología', description: 'Dentistas, higienistas y asistentes dentales' },
            { name: 'Farmacia', description: 'Químicos farmacéuticos y auxiliares de farmacia' },
            { name: 'Kinesiología', description: 'Kinesiólogos y terapeutas físicos' },
            { name: 'Psicología', description: 'Psicólogos clínicos y organizacionales' },
            { name: 'Laboratorio Clínico', description: 'Tecnólogos médicos y técnicos de laboratorio' },
            { name: 'Cuidado de Adultos Mayores', description: 'Cuidadores y técnicos en gerontología' }
          ]
        },
        {
          name: 'Educación y Capacitación',
          description: 'Empleos en educación, enseñanza y formación',
          children: [
            { name: 'Educación Básica', description: 'Profesores de enseñanza básica y media' },
            { name: 'Educación Superior', description: 'Docentes universitarios e investigadores' },
            { name: 'Educación Parvularia', description: 'Educadoras de párvulos y técnicos en educación inicial' },
            { name: 'Educación Especial', description: 'Profesores de educación diferencial y terapeutas' },
            { name: 'Capacitación Empresarial', description: 'Relatores, consultores y coaches' },
            { name: 'Idiomas', description: 'Profesores de inglés y otros idiomas' },
            { name: 'Educación Técnica', description: 'Instructores técnicos y profesionales' }
          ]
        },
        {
          name: 'Construcción y Arquitectura',
          description: 'Empleos en construcción, arquitectura e ingeniería civil',
          children: [
            { name: 'Construcción Civil', description: 'Maestros, operarios y técnicos en construcción' },
            { name: 'Arquitectura', description: 'Arquitectos y dibujantes técnicos' },
            { name: 'Ingeniería Civil', description: 'Ingenieros civiles y calculistas' },
            { name: 'Electricidad', description: 'Electricistas y técnicos eléctricos' },
            { name: 'Gasfitería', description: 'Gasfiteres y técnicos sanitarios' },
            { name: 'Carpintería', description: 'Carpinteros y ebanistas' },
            { name: 'Pintura', description: 'Pintores y decoradores' },
            { name: 'Soldadura', description: 'Soldadores y técnicos en metalurgia' }
          ]
        },
        {
          name: 'Gastronomía y Turismo',
          description: 'Empleos en restaurantes, hoteles, turismo y servicios gastronómicos',
          children: [
            { name: 'Cocina', description: 'Chefs, cocineros y ayudantes de cocina' },
            { name: 'Servicio de Mesa', description: 'Meseros, garzonas y capitanes de mesón' },
            { name: 'Hotelería', description: 'Recepcionistas, conserjes y housekeeping' },
            { name: 'Turismo', description: 'Guías turísticos y operadores de turismo' },
            { name: 'Barista y Cafetería', description: 'Baristas y especialistas en café' },
            { name: 'Panadería y Pastelería', description: 'Panaderos, pasteleros y reposteros' },
            { name: 'Eventos', description: 'Organizadores de eventos y protocolo' }
          ]
        },
        {
          name: 'Transporte y Logística',
          description: 'Empleos en transporte, distribución y logística',
          children: [
            { name: 'Conducción', description: 'Conductores de camión, bus y vehículos livianos' },
            { name: 'Delivery', description: 'Repartidores y mensajeros' },
            { name: 'Bodega', description: 'Bodegueros, estibadores y operarios de almacén' },
            { name: 'Operaciones Portuarias', description: 'Operadores portuarios y marítimos' },
            { name: 'Aeroportuario', description: 'Personal aeroportuario y handling' },
            { name: 'Transporte Público', description: 'Conductores de micro y metro' },
            { name: 'Logística Internacional', description: 'Comercio exterior y aduanas' }
          ]
        },
        {
          name: 'Marketing y Comunicaciones',
          description: 'Empleos en marketing, publicidad, comunicaciones y medios',
          children: [
            { name: 'Marketing Digital', description: 'Community managers, SEO y SEM' },
            { name: 'Publicidad', description: 'Creativos publicitarios y account managers' },
            { name: 'Comunicaciones', description: 'Periodistas, relacionadores públicos y comunicadores' },
            { name: 'Diseño Gráfico', description: 'Diseñadores gráficos y creativos visuales' },
            { name: 'Fotografía', description: 'Fotógrafos y editores de imagen' },
            { name: 'Audiovisual', description: 'Productores, editores y camarógrafos' },
            { name: 'Redes Sociales', description: 'Especialistas en redes sociales y contenido digital' }
          ]
        },
        {
          name: 'Producción y Manufactura',
          description: 'Empleos en industrias manufactureras y producción',
          children: [
            { name: 'Operario de Producción', description: 'Operarios de línea y técnicos de producción' },
            { name: 'Control de Calidad', description: 'Inspectores y técnicos de calidad' },
            { name: 'Mantención Industrial', description: 'Técnicos de mantención y mecánicos industriales' },
            { name: 'Textil', description: 'Operarios textiles y confeccionistas' },
            { name: 'Alimentaria', description: 'Operarios de plantas procesadoras de alimentos' },
            { name: 'Química', description: 'Técnicos químicos y operadores de planta' },
            { name: 'Metalmecánica', description: 'Torneros, fresadores y técnicos mecánicos' }
          ]
        },
        {
          name: 'Servicios Generales',
          description: 'Empleos en servicios de limpieza, seguridad y mantención',
          children: [
            { name: 'Limpieza', description: 'Personal de aseo y limpieza' },
            { name: 'Seguridad', description: 'Guardias de seguridad y vigilantes' },
            { name: 'Jardinería', description: 'Jardineros y paisajistas' },
            { name: 'Mantención', description: 'Técnicos de mantención y reparaciones' },
            { name: 'Portería', description: 'Porteros y conserjes' },
            { name: 'Servicios Domésticos', description: 'Empleadas domésticas y cuidadoras' }
          ]
        },
        {
          name: 'Agricultura y Pesca',
          description: 'Empleos en sector agrícola, pecuario y pesquero',
          children: [
            { name: 'Agricultura', description: 'Agricultores, temporeros y técnicos agrícolas' },
            { name: 'Ganadería', description: 'Ganaderos y técnicos pecuarios' },
            { name: 'Pesca', description: 'Pescadores y técnicos pesqueros' },
            { name: 'Forestal', description: 'Técnicos forestales y operarios forestales' },
            { name: 'Agroindustria', description: 'Técnicos en procesamiento agroindustrial' }
          ]
        }
      ];

      // Create main categories and their subcategories
      for (const mainCategory of categories) {
        console.log(`Creating main category: ${mainCategory.name}`);
        
        const parentCategory = await this.categoriesService.createCategory(null, {
          name: mainCategory.name,
          description: mainCategory.description,
          isActive: true,
          displayOrder: categories.indexOf(mainCategory)
        });

        // Create subcategories
        for (const subCategory of mainCategory.children) {
          console.log(`  Creating subcategory: ${subCategory.name}`);
          
          await this.categoriesService.createCategory(parentCategory.id, {
            name: subCategory.name,
            description: subCategory.description,
            isActive: true,
            displayOrder: mainCategory.children.indexOf(subCategory)
          });
        }
      }

      console.log('✅ Job categories seeding completed successfully!');
      
    } catch (error) {
      console.error('❌ Error seeding job categories:', error);
      throw error;
    }
  }

  async clearAllCategories(): Promise<void> {
    console.log('🗑️ Clearing all existing categories...');
    
    try {
      // This is a destructive operation - use with caution
      const { categories } = await this.categoriesService.searchCategoriesAdvanced({
        includeInactive: true,
        limit: 1000
      });

      // Delete all categories (children first, then parents)
      const sortedCategories = categories.sort((a, b) => b.level - a.level);
      
      for (const category of sortedCategories) {
        try {
          await this.categoriesService.deleteCategory(category.id, 'CASCADE' as any);
          console.log(`Deleted category: ${category.name}`);
        } catch (error) {
          console.warn(`Could not delete category ${category.name}:`, error.message);
        }
      }

      console.log('✅ Categories cleared successfully!');
      
    } catch (error) {
      console.error('❌ Error clearing categories:', error);
      throw error;
    }
  }
}